<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SurveyAnswer;
use App\Models\SurveyForm;
use App\Models\SurveyQuestion;
use App\Models\SurveyResponse;
use App\Models\SurveySection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SurveyController extends Controller
{
    public function index(Request $request)
    {
        $query = SurveyForm::with(['creator'])->withCount('responses');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")->orWhere('description', 'like', "%{$s}%");
            });
        }
        if ($request->filled('type')) $query->where('type', $request->type);
        if ($request->filled('status')) $query->where('status', $request->status);

        $forms = $query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 15));

        $forms->getCollection()->transform(function ($form) {
            $form->average_rating = round($form->responses()->avg('average_score') ?? 0, 2);
            $form->total_responses = $form->responses()->count();
            return $form;
        });

        return $this->success($forms);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'nullable|string|in:feedback,survey,assessment,evaluation',
            'sections' => 'required|array|min:1',
            'sections.*.title' => 'required|string',
            'sections.*.description' => 'nullable|string',
            'sections.*.questions' => 'required|array|min:1',
            'sections.*.questions.*.question' => 'required|string',
            'sections.*.questions.*.type' => 'nullable|string|in:rating,text,yes_no',
            'sections.*.questions.*.max_score' => 'nullable|integer|min:1|max:10',
        ]);

        $form = SurveyForm::create([
            'title' => $request->title,
            'description' => $request->description,
            'type' => $request->type ?? 'feedback',
            'status' => 'active',
            'created_by' => $request->user()->id,
        ]);

        foreach ($request->sections as $si => $section) {
            $sec = SurveySection::create([
                'survey_form_id' => $form->id,
                'title' => $section['title'],
                'description' => $section['description'] ?? null,
                'order' => $si + 1,
            ]);
            foreach ($section['questions'] as $qi => $q) {
                SurveyQuestion::create([
                    'survey_form_id' => $form->id,
                    'survey_section_id' => $sec->id,
                    'question' => $q['question'],
                    'type' => $q['type'] ?? 'rating',
                    'max_score' => $q['max_score'] ?? 5,
                    'order' => $qi + 1,
                ]);
            }
        }

        return $this->success($form->load('sections.questions'), 'Survey form created', 201);
    }

    public function show($id)
    {
        $form = SurveyForm::with(['sections.questions', 'creator'])->findOrFail($id);
        $form->average_rating = round($form->responses()->avg('average_score') ?? 0, 2);
        $form->total_responses = $form->responses()->count();
        return $this->success($form);
    }

    public function update(Request $request, $id)
    {
        $form = SurveyForm::findOrFail($id);
        $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'type' => 'nullable|string|in:feedback,survey,assessment,evaluation',
            'status' => 'nullable|string|in:draft,active,closed',
            'sections' => 'nullable|array',
            'sections.*.title' => 'required|string',
            'sections.*.questions.*.question' => 'required|string',
            'sections.*.questions.*.type' => 'nullable|string|in:rating,text,yes_no',
            'sections.*.questions.*.max_score' => 'nullable|integer|min:1|max:10',
        ]);
        $form->update($request->only(['title', 'description', 'type', 'status']));

        if ($request->has('sections')) {
            $existingSections = $form->sections->keyBy('id');
            $keepSectionIds = [];

            foreach ($request->sections as $si => $secData) {
                $sectionId = $secData['id'] ?? null;
                if ($sectionId && $existingSections->has($sectionId)) {
                    $section = $existingSections->get($sectionId);
                    $section->update([
                        'title' => $secData['title'],
                        'description' => $secData['description'] ?? null,
                        'order' => $si + 1,
                    ]);
                } else {
                    $section = SurveySection::create([
                        'survey_form_id' => $form->id,
                        'title' => $secData['title'],
                        'description' => $secData['description'] ?? null,
                        'order' => $si + 1,
                    ]);
                }
                $keepSectionIds[] = $section->id;

                if (isset($secData['questions'])) {
                    $existingQuestions = $section->questions->keyBy('id');
                    $keepQuestionIds = [];
                    foreach ($secData['questions'] as $qi => $qData) {
                        $qId = $qData['id'] ?? null;
                        if ($qId && $existingQuestions->has($qId)) {
                            $question = $existingQuestions->get($qId);
                            $question->update([
                                'question' => $qData['question'],
                                'type' => $qData['type'] ?? 'rating',
                                'max_score' => $qData['max_score'] ?? 5,
                                'survey_section_id' => $section->id,
                                'order' => $qi + 1,
                            ]);
                        } else {
                            $question = SurveyQuestion::create([
                                'survey_form_id' => $form->id,
                                'survey_section_id' => $section->id,
                                'question' => $qData['question'],
                                'type' => $qData['type'] ?? 'rating',
                                'max_score' => $qData['max_score'] ?? 5,
                                'order' => $qi + 1,
                            ]);
                        }
                        $keepQuestionIds[] = $question->id;
                    }
                    $section->questions()->whereNotIn('id', $keepQuestionIds)->delete();
                }
            }
            $form->sections()->whereNotIn('id', $keepSectionIds)->delete();
        }

        return $this->success($form->load('sections.questions'), 'Survey updated');
    }

    public function destroy($id)
    {
        SurveyForm::findOrFail($id)->delete();
        return $this->success(null, 'Survey deleted');
    }

    public function submitResponse(Request $request, $id)
    {
        $form = SurveyForm::findOrFail($id);

        $request->validate([
            'respondent_name' => 'nullable|string|max:255',
            'respondent_email' => 'nullable|email',
            'department' => 'nullable|string|max:255',
            'answers' => 'required|array',
            'answers.*.question_id' => 'required|exists:survey_questions,id',
            'answers.*.score' => 'nullable|integer|min:1',
            'answers.*.answer_text' => 'nullable|string',
            'remarks' => 'nullable|string',
        ]);

        $totalScore = 0;
        $questionCount = 0;

        $response = SurveyResponse::create([
            'survey_form_id' => $form->id,
            'respondent_name' => $request->respondent_name,
            'respondent_email' => $request->respondent_email,
            'department' => $request->department,
            'remarks' => $request->remarks,
            'submitted_by' => $request->user()->id,
        ]);

        foreach ($request->answers as $answer) {
            if (isset($answer['score'])) {
                $totalScore += $answer['score'];
                $questionCount++;
            }
            SurveyAnswer::create([
                'survey_response_id' => $response->id,
                'survey_question_id' => $answer['question_id'],
                'score' => $answer['score'] ?? null,
                'answer_text' => $answer['answer_text'] ?? null,
            ]);
        }

        $avg = $questionCount > 0 ? round($totalScore / $questionCount, 2) : null;
        $response->update([
            'total_score' => $totalScore,
            'average_score' => $avg,
        ]);

        return $this->success($response->load('answers'), 'Response submitted', 201);
    }

    public function responses(Request $request, $id)
    {
        $responses = SurveyResponse::with(['answers.question', 'submitter'])
            ->where('survey_form_id', $id)
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));
        return $this->success($responses);
    }

    public function analysis($id)
    {
        $form = SurveyForm::with('sections.questions')->findOrFail($id);
        $responses = $form->responses;

        $sectionsAnalysis = $form->sections->map(function ($section) {
            $questionsAnalysis = $section->questions->map(function ($q) {
                $answers = SurveyAnswer::where('survey_question_id', $q->id)->whereNotNull('score');
                return [
                    'question_id' => $q->id,
                    'question' => $q->question,
                    'average' => round($answers->avg('score') ?? 0, 2),
                    'count' => $answers->count(),
                    'max_score' => $q->max_score,
                    'distribution' => $answers->select('score', DB::raw('COUNT(*) as count'))
                        ->groupBy('score')->orderBy('score')->pluck('count', 'score'),
                ];
            });
            return [
                'section_id' => $section->id,
                'title' => $section->title,
                'average' => round($questionsAnalysis->avg('average') ?? 0, 2),
                'questions' => $questionsAnalysis,
            ];
        });

        return $this->success([
            'form' => $form,
            'total_responses' => $responses->count(),
            'overall_average' => round($responses->avg('average_score') ?? 0, 2),
            'sections' => $sectionsAnalysis,
        ]);
    }
}
