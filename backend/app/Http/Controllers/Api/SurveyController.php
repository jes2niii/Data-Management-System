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
use Illuminate\Validation\ValidationException;

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
        $data = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'sometimes|required|string|in:feedback,survey,assessment,evaluation',
            'status' => 'sometimes|required|string|in:draft,active,closed',
            'sections' => 'sometimes|required|array|list',
            'sections.*.id' => 'sometimes|required|integer|min:1|distinct',
            'sections.*.title' => 'required|string|max:255',
            'sections.*.description' => 'nullable|string',
            'sections.*.questions' => 'required|array|list',
            'sections.*.questions.*.id' => 'sometimes|required|integer|min:1|distinct',
            'sections.*.questions.*.question' => 'required|string',
            'sections.*.questions.*.type' => 'nullable|string|in:rating,text,yes_no',
            'sections.*.questions.*.max_score' => 'nullable|integer|min:1|max:10',
        ]);
        $form = DB::transaction(function () use ($id, $data) {
            $form = SurveyForm::lockForUpdate()->findOrFail($id);
            if (isset($data['sections'])) {
                abort_if($form->responses()->exists() || SurveyAnswer::whereHas('question', fn ($query) =>
                    $query->where('survey_form_id', $form->id))->exists(),
                    409, 'Survey questions cannot be changed after a response has been recorded. Create a new survey for structural changes.');
                $this->replaceSections($form, $data['sections']);
            }
            $form->update(\Illuminate\Support\Arr::except($data, ['sections']));

            return $form;
        });

        return $this->success($form->load('sections.questions'), 'Survey updated');
    }

    private function replaceSections(SurveyForm $form, array $sections): void
    {
        $existing = $form->sections()->with('questions')->get()->keyBy('id');
        $keepSections = [];
        foreach ($sections as $index => $values) {
            $section = isset($values['id']) ? $existing->get($values['id']) : new SurveySection;
            if ($section === null) {
                throw ValidationException::withMessages(["sections.{$index}.id" => 'The section must belong to this survey.']);
            }
            $section->fill(['title' => $values['title'], 'order' => $index + 1]
                + \Illuminate\Support\Arr::only($values, ['description']));
            $form->sections()->save($section);
            $keepSections[] = $section->id;
            $questions = $section->questions->keyBy('id');
            $keepQuestions = [];
            foreach ($values['questions'] as $offset => $input) {
                $question = isset($input['id']) ? $questions->get($input['id']) : new SurveyQuestion;
                if ($question === null) {
                    throw ValidationException::withMessages([
                        "sections.{$index}.questions.{$offset}.id" => 'The question must belong to this section.',
                    ]);
                }
                $question->fill([
                    'survey_form_id' => $form->id, 'survey_section_id' => $section->id,
                    'question' => $input['question'], 'type' => $input['type'] ?? 'rating',
                    'max_score' => $input['max_score'] ?? 5, 'order' => $offset + 1,
                ])->save();
                $keepQuestions[] = $question->id;
            }
            $section->questions()->whereNotIn('id', $keepQuestions)->delete();
        }
        $form->sections()->whereNotIn('id', $keepSections)->delete();
    }

    public function destroy($id)
    {
        SurveyForm::findOrFail($id)->delete();
        return $this->success(null, 'Survey deleted');
    }

    public function submitResponse(Request $request, $id)
    {
        $data = $request->validate([
            'respondent_name' => 'nullable|string|max:255',
            'respondent_email' => 'nullable|email|max:255',
            'department' => 'nullable|string|max:255',
            'answers' => 'required|array|list',
            'answers.*' => 'required|array:question_id,score,answer_text',
            'answers.*.question_id' => 'required|integer|min:1|distinct',
            'answers.*.score' => 'nullable|integer|min:0',
            'answers.*.answer_text' => 'nullable|string',
            'remarks' => 'nullable|string',
        ]);

        $response = DB::transaction(function () use ($id, $data, $request) {
            $form = SurveyForm::lockForUpdate()->findOrFail($id);
            abort_unless($form->status === 'active', 409, 'This survey is not accepting responses.');
            $questions = $form->questions()->whereIn('id', array_column($data['answers'], 'question_id'))
                ->lockForUpdate()->get()->keyBy('id');
            $totalScore = 0;
            $scored = 0;

            foreach ($data['answers'] as $index => $answer) {
                $question = $questions->get((int) $answer['question_id']);
                if ($question === null) {
                    throw ValidationException::withMessages(["answers.{$index}.question_id" => 'The question must belong to this survey.']);
                }
                if (!isset($answer['score'])) {
                    continue;
                }
                $score = (int) $answer['score'];
                $valid = match ($question->type) {
                    'rating' => $score >= 1 && $score <= $question->max_score,
                    'yes_no' => $score === 0 || $score === 1,
                    default => false,
                };
                if (!$valid) {
                    throw ValidationException::withMessages(["answers.{$index}.score" => 'The score is not valid for this question.']);
                }
                $totalScore += $score;
                $scored++;
            }
            // The current total_score column is DECIMAL(5, 2).
            if ($totalScore > 999) {
                throw ValidationException::withMessages(['answers' => 'The total score exceeds the supported range.']);
            }

            $response = $form->responses()->create([
                'respondent_name' => $data['respondent_name'] ?? null,
                'respondent_email' => $data['respondent_email'] ?? null,
                'department' => $data['department'] ?? null,
                'remarks' => $data['remarks'] ?? null,
                'submitted_by' => $request->user()->id,
                'total_score' => $totalScore,
                'average_score' => $scored > 0 ? round($totalScore / $scored, 2) : null,
            ]);
            $response->answers()->createMany(array_map(fn (array $answer) => [
                'survey_question_id' => $answer['question_id'],
                'score' => $answer['score'] ?? null,
                'answer_text' => $answer['answer_text'] ?? null,
            ], $data['answers']));

            return $response;
        });

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
