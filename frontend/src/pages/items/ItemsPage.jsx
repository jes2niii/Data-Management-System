import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { format } from "date-fns"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts"
import { Plus, Pencil, Trash2, Search, ClipboardList, Star, TrendingUp, Users } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import TestItemAnalysis from "./TestItemAnalysis"

const typeMap = { feedback: "Feedback", survey: "Survey", assessment: "Assessment", evaluation: "Evaluation" }
const statusMap = { draft: { v: "outline", l: "Draft" }, active: { v: "success", l: "Active" }, closed: { v: "destructive", l: "Closed" } }

export default function ItemsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeModule = searchParams.get("tab") || "survey"
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingForm, setEditingForm] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingForm, setDeletingForm] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedForm, setSelectedForm] = useState(null)
  const [respondOpen, setRespondOpen] = useState(false)
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [chartType, setChartType] = useState("bar")

  const [formData, setFormData] = useState({ title: "", description: "", type: "feedback", sections: [{ title: "", questions: [{ question: "", type: "rating", max_score: 5 }] }] })
  const [respondData, setRespondData] = useState({ respondent_name: "", department: "", remarks: "", answers: [] })

  const perPage = 15

  const { data, isLoading } = useQuery({
    queryKey: ["surveys", search, typeFilter, page],
    queryFn: () => api.get("/surveys", { params: { search, type: typeFilter !== "all" ? typeFilter : undefined, page, per_page: perPage } }).then(r => r.data),
  })

  const { data: detailData, refetch: refetchDetail } = useQuery({
    queryKey: ["survey-detail", selectedForm?.id],
    enabled: !!selectedForm?.id && (detailOpen || analysisOpen),
    queryFn: () => api.get(`/surveys/${selectedForm.id}`).then(r => r.data),
  })

  const { data: analysisData } = useQuery({
    queryKey: ["survey-analysis", selectedForm?.id],
    enabled: analysisOpen && !!selectedForm?.id,
    queryFn: () => api.get(`/surveys/${selectedForm.id}/analysis`).then(r => r.data),
  })

  const forms = data?.data?.data || []
  const totalPages = data?.data?.last_page || 1
  const survey = detailData?.data || {}

  const mutation = useMutation({
    mutationFn: (fd) => editingForm ? api.put(`/surveys/${editingForm.id}`, fd) : api.post("/surveys", fd),
    onSuccess: () => {
      toast.success(editingForm ? "Survey updated" : "Survey created")
      queryClient.invalidateQueries({ queryKey: ["surveys"] })
      setDialogOpen(false); setEditingForm(null); resetForm()
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/surveys/${id}`),
    onSuccess: () => { toast.success("Survey deleted"); queryClient.invalidateQueries({ queryKey: ["surveys"] }); setDeleteOpen(false) },
  })

  const respondMutation = useMutation({
    mutationFn: (fd) => api.post(`/surveys/${selectedForm?.id}/responses`, fd),
    onSuccess: () => {
      toast.success("Response submitted")
      queryClient.invalidateQueries({ queryKey: ["survey-detail"] })
      queryClient.invalidateQueries({ queryKey: ["survey-analysis"] })
      setRespondOpen(false)
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed"),
  })

  const resetForm = () => setFormData({ title: "", description: "", type: "feedback", sections: [{ title: "", questions: [{ question: "", type: "rating", max_score: 5 }] }] })

  const addSection = () => setFormData({ ...formData, sections: [...formData.sections, { title: "", questions: [{ question: "", type: "rating", max_score: 5 }] }] })
  const removeSection = (si) => setFormData({ ...formData, sections: formData.sections.filter((_, i) => i !== si) })
  const addQuestion = (si) => {
    const secs = [...formData.sections]
    secs[si].questions.push({ question: "", type: "rating", max_score: 5 })
    setFormData({ ...formData, sections: secs })
  }
  const removeQuestion = (si, qi) => {
    const secs = [...formData.sections]
    secs[si].questions = secs[si].questions.filter((_, i) => i !== qi)
    setFormData({ ...formData, sections: secs })
  }

  const handleEdit = async (f) => {
    setEditingForm(f)
    try {
      const res = await api.get(`/surveys/${f.id}`)
      const survey = res.data?.data
      const sections = survey.sections?.length > 0 ? survey.sections.map(s => ({
        id: s.id,
        title: s.title || "",
        questions: s.questions?.length > 0 ? s.questions.map(q => ({ id: q.id, question: q.question || "", type: q.type || "rating", max_score: q.max_score || 5 })) : [{ question: "", type: "rating", max_score: 5 }]
      })) : [{ title: "", questions: [{ question: "", type: "rating", max_score: 5 }] }]
      setFormData({ title: survey.title || "", description: survey.description || "", type: survey.type || "feedback", sections })
    } catch {
      setFormData({ title: f.title || "", description: f.description || "", type: f.type || "feedback", sections: [{ title: "", questions: [{ question: "", type: "rating", max_score: 5 }] }] })
    }
    setDialogOpen(true)
  }

  const openDetail = (f) => { setSelectedForm(f); setDetailOpen(true); refetchDetail() }
  const surveyQuestions = (survey.sections || []).flatMap(s => s.questions || [])

  const openRespond = () => {
    if (surveyQuestions.length === 0) return
    setRespondData({ respondent_name: "", department: "", remarks: "", answers: surveyQuestions.map(q => ({ question_id: q.id, score: null, answer_text: "" })) })
    setRespondOpen(true)
  }
  const openAnalysis = (f) => { setSelectedForm(f); setAnalysisOpen(true) }

  const chartData = (analysisData?.data?.questions_analysis || []).map(q => ({ name: q.question?.substring(0, 30) || "", average: q.average || 0 }))
  const sectionsAnalysis = analysisData?.data?.sections || []
  const overallAvg = analysisData?.data?.overall_average || 0
  const totalResp = analysisData?.data?.total_responses || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Item Analysis</h1>
          <p className="text-muted-foreground">{activeModule === "survey" ? "Surveys, feedback & assessments" : "U-L Method test item analysis"}</p>
        </div>
        {activeModule === "survey" && (
        <Button onClick={() => { resetForm(); setEditingForm(null); setDialogOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Create Survey
        </Button>
        )}
      </div>

      {activeModule === "test" ? <TestItemAnalysis /> : (
      <>
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search surveys..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="feedback">Feedback</SelectItem>
            <SelectItem value="survey">Survey</SelectItem>
            <SelectItem value="assessment">Assessment</SelectItem>
            <SelectItem value="evaluation">Evaluation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : forms.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-30" />No surveys found. Create your first survey form.</div>
          ) : (
            <>
              <Table>
                <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Questions</TableHead><TableHead>Responses</TableHead><TableHead>Avg Rating</TableHead><TableHead>Status</TableHead><TableHead className="w-[120px]">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {forms.map(f => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium cursor-pointer hover:text-primary" onClick={() => openDetail(f)}>{f.title}</TableCell>
                      <TableCell><Badge variant="outline">{typeMap[f.type] || f.type}</Badge></TableCell>
                      <TableCell>{f.questions_count || "-"}</TableCell>
                      <TableCell>{f.total_responses || f.responses_count || 0}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />{Number(f.average_rating || 0).toFixed(1)}</div>
                      </TableCell>
                      <TableCell>
                        {(() => { const s = statusMap[f.status] || statusMap.draft; return <Badge variant={s.v}>{s.l}</Badge> })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(f)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => openAnalysis(f)} title="Analysis"><TrendingUp className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { setDeletingForm(f); setDeleteOpen(true) }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingForm ? "Edit Survey" : "Create Survey Form"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Title *</Label><Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
              <div className="space-y-2"><Label>Type</Label><Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="feedback">Feedback</SelectItem><SelectItem value="survey">Survey</SelectItem><SelectItem value="assessment">Assessment</SelectItem><SelectItem value="evaluation">Evaluation</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
            <Separator />
            <div className="flex items-center justify-between"><Label className="font-semibold">Sections</Label><Button variant="outline" size="sm" onClick={addSection}><Plus className="mr-1 h-3 w-3" /> Add Section</Button></div>
            <div className="space-y-4">
              {formData.sections.map((sec, si) => (
                <div key={si} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Section {si + 1}</span>
                    <Input className="flex-1" value={sec.title} placeholder="Section title" onChange={e => { const secs = [...formData.sections]; secs[si].title = e.target.value; setFormData({ ...formData, sections: secs }) }} />
                    {formData.sections.length > 1 && <Button variant="ghost" size="icon" onClick={() => removeSection(si)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </div>
                  <div className="flex items-center justify-between"><Label className="text-xs text-muted-foreground">Questions</Label><Button variant="ghost" size="sm" onClick={() => addQuestion(si)}><Plus className="mr-1 h-3 w-3" /> Add</Button></div>
                  {sec.questions.map((q, qi) => (
                    <div key={qi} className="flex items-start gap-2 pl-2">
                      <span className="text-xs text-muted-foreground mt-2">{qi + 1}.</span>
                      <div className="flex-1 space-y-1">
                        <Input value={q.question} placeholder="Question" onChange={e => { const secs = [...formData.sections]; secs[si].questions[qi].question = e.target.value; setFormData({ ...formData, sections: secs }) }} />
                        <div className="flex gap-2">
                          <Select value={q.type} onValueChange={v => { const secs = [...formData.sections]; secs[si].questions[qi].type = v; setFormData({ ...formData, sections: secs }) }}>
                            <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="rating">Rating</SelectItem><SelectItem value="text">Text</SelectItem><SelectItem value="yes_no">Yes/No</SelectItem></SelectContent>
                          </Select>
                          {q.type === "rating" && <Input type="number" min={1} max={10} value={q.max_score} className="w-[60px] h-8 text-xs" onChange={e => { const secs = [...formData.sections]; secs[si].questions[qi].max_score = Number(e.target.value); setFormData({ ...formData, sections: secs }) }} placeholder="Max" />}
                        </div>
                      </div>
                      {sec.questions.length > 1 && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeQuestion(si, qi)}><Trash2 className="h-3 w-3 text-destructive" /></Button>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingForm(null) }}>Cancel</Button>
            <Button disabled={!formData.title.trim() || mutation.isPending} onClick={() => mutation.mutate(formData)}>{mutation.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail/Respond Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{survey.title}</DialogTitle><DialogDescription>{survey.description}</DialogDescription></DialogHeader>
          <Tabs defaultValue="preview">
            <TabsList><TabsTrigger value="preview">Preview</TabsTrigger><TabsTrigger value="respond">Submit Response</TabsTrigger></TabsList>
            <TabsContent value="preview" className="space-y-4 pt-4">
              <div className="flex gap-4 text-sm"><span className="text-muted-foreground">Type: <Badge variant="outline">{typeMap[survey.type]}</Badge></span><span className="text-muted-foreground">Rating: <Star className="inline h-3 w-3 text-yellow-500" /> {Number(survey.average_rating || 0).toFixed(1)}</span><span className="text-muted-foreground">Responses: <Users className="inline h-3 w-3" /> {survey.total_responses || 0}</span></div>
              <div className="space-y-4">
                {(survey.sections || []).map((sec, si) => (
                  <div key={sec.id || si} className="space-y-2">
                    <h4 className="font-semibold text-sm border-b pb-1">{sec.title || `Section ${si + 1}`}</h4>
                    {(sec.questions || []).map((q, qi) => (
                      <div key={q.id} className="p-2 border rounded">
                        <p className="text-sm">{qi + 1}. {q.question}</p>
                        <p className="text-xs text-muted-foreground">Type: {q.type} {q.type === "rating" && `(1-${q.max_score})`}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="respond" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Name</Label><Input value={respondData.respondent_name} onChange={e => setRespondData({ ...respondData, respondent_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Department</Label><Input value={respondData.department} onChange={e => setRespondData({ ...respondData, department: e.target.value })} /></div>
              </div>
              <div className="space-y-4">
                {(survey.sections || []).map((sec, si) => (
                  <div key={sec.id || si} className="space-y-2">
                    <h4 className="font-semibold text-sm border-b pb-1">{sec.title || `Section ${si + 1}`}</h4>
                    {(sec.questions || []).map((q, qi) => {
                      const idx = surveyQuestions.findIndex(sq => sq.id === q.id)
                      return (
                        <div key={q.id} className="p-3 border rounded-lg space-y-2">
                          <p className="font-medium text-sm">{qi + 1}. {q.question}</p>
                          {q.type === "rating" ? (
                            <div className="flex gap-2">
                              {Array.from({ length: q.max_score || 5 }, (_, j) => j + 1).map(s => (
                                <button key={s} className={`h-10 w-10 rounded-full border text-sm font-medium transition-colors ${(respondData.answers[idx]?.score || 0) >= s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                                  onClick={() => { const a = [...respondData.answers]; a[idx] = { ...a[idx], question_id: q.id, score: s }; setRespondData({ ...respondData, answers: a }) }}>
                                  {s}
                                </button>
                              ))}
                            </div>
                          ) : q.type === "yes_no" ? (
                            <div className="flex gap-2">
                              {["Yes", "No"].map(v => (
                                <Button key={v} variant={(respondData.answers[idx]?.answer_text || "") === v ? "default" : "outline"} size="sm"
                                  onClick={() => { const a = [...respondData.answers]; a[idx] = { ...a[idx], question_id: q.id, answer_text: v, score: v === "Yes" ? 1 : 0 }; setRespondData({ ...respondData, answers: a }) }}>
                                  {v}
                                </Button>
                              ))}
                            </div>
                          ) : (
                            <Input value={respondData.answers[idx]?.answer_text || ""} onChange={e => { const a = [...respondData.answers]; a[idx] = { ...a[idx], question_id: q.id, answer_text: e.target.value }; setRespondData({ ...respondData, answers: a }) }} placeholder="Your response" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
              <div className="space-y-2"><Label>Remarks</Label><Input value={respondData.remarks} onChange={e => setRespondData({ ...respondData, remarks: e.target.value })} /></div>
              <Button className="w-full" disabled={respondMutation.isPending} onClick={() => respondMutation.mutate(respondData)}>{respondMutation.isPending ? "Submitting..." : "Submit Response"}</Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Analysis Dialog */}
      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Analysis: {survey.title}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Responses</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totalResp}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Overall Average</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold flex items-center gap-1"><Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />{overallAvg.toFixed(1)}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Sections</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{sectionsAnalysis.length}</div></CardContent></Card>
          </div>
          <div className="flex gap-1 mb-4">
            {["bar", "pie", "radar"].map(t => (
              <Button key={t} variant={chartType === t ? "default" : "outline"} size="sm" onClick={() => setChartType(t)} className="capitalize">{t}</Button>
            ))}
          </div>
          <div className="space-y-6 max-h-[60vh] overflow-y-auto">
            {sectionsAnalysis.map((sec, si) => {
              const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"]
              return (
                <div key={si}>
                  <h4 className="font-semibold text-sm mb-2">{sec.title || `Section ${si + 1}`} <span className="text-muted-foreground font-normal">(Avg: {sec.average?.toFixed(1) || "0.0"})</span></h4>
                  <div className="space-y-4">
                    {(sec.questions || []).map((q, qi) => {
                      const dist = q.distribution || {}
                      const maxScore = q.max_score || 5
                      const chartData = Array.from({ length: maxScore }, (_, i) => ({
                        name: `${i + 1} star${i > 0 ? "s" : ""}`,
                        value: dist[i + 1] || 0,
                      }))
                      const maxEntry = chartData.reduce((max, e) => e.value > max.value ? e : max, { value: 0 })
                      return (
                        <div key={qi} className="border rounded-lg p-3">
                          <p className="text-sm font-medium mb-1">{qi + 1}. {q.question}</p>
                          <p className="text-xs text-muted-foreground mb-2">Avg: {q.average?.toFixed(1) || "0.0"} / {maxScore} | Responses: {q.count || 0}</p>
                          {chartData.length > 0 ? (
                            <>
                              {chartType === "pie" ? (
                                <ResponsiveContainer width="100%" height={200}>
                                  <PieChart>
                                    <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ value }) => value > 0 ? value : ""}>
                                      {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                  </PieChart>
                                </ResponsiveContainer>
                              ) : chartType === "radar" ? (
                                <ResponsiveContainer width="100%" height={200}>
                                  <RadarChart data={chartData}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="name" className="text-xs" />
                                    <PolarRadiusAxis />
                                    <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                                  </RadarChart>
                                </ResponsiveContainer>
                              ) : (
                                <ResponsiveContainer width="100%" height={200}>
                                  <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="name" className="text-xs" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              )}
                              {maxEntry.value > 0 && (
                                <p className="text-xs text-center mt-1 font-medium">
                                  Highest: <span className="text-primary">{maxEntry.name}</span> ({maxEntry.value} response{maxEntry.value !== 1 ? "s" : ""})
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">No rating data yet</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent><DialogHeader><DialogTitle>Delete Survey</DialogTitle></DialogHeader>
          <p>Delete <strong>{deletingForm?.title}</strong>? This cannot be undone.</p>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button><Button variant="destructive" onClick={() => deleteMutation.mutate(deletingForm?.id)}>Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      </>
      )}
    </div>
  )
}
