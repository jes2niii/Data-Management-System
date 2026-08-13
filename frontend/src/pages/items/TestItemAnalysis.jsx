import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Plus, Trash2, Search, TrendingUp, Play, Users, Pencil } from "lucide-react"

const actionColors = { Retain: "success", Revise: "warning", Reject: "destructive" }
const dfColors = {
  "Very Difficult": "destructive", Difficult: "destructive", "Moderately Difficult": "warning", Easy: "success", "Very Easy": "success"
}

const getItemOptions = (item) => {
  if (item?.options && item.options.length > 0) return item.options
  if (item?.item_type === "true_false") return ["True", "False"]
  if (item?.item_type === "identification") return ["Correct", "Wrong"]
  return ["A", "B", "C", "D"]
}

export default function TestItemAnalysis() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [examDialogOpen, setExamDialogOpen] = useState(false)
  const [editExamOpen, setEditExamOpen] = useState(false)
  const [studentDialogOpen, setStudentDialogOpen] = useState(false)
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [selectedExam, setSelectedExam] = useState(null)
  const [editingExamId, setEditingExamId] = useState(null)
  const [examForm, setExamForm] = useState({ title: "", description: "", subject: "", items: [{ item_number: 1, question: "", correct_answer: "", item_type: "multiple_choice", options: null }] })
  const [studentForm, setStudentForm] = useState([{ name: "", answers: [] }])

  const { data, isLoading } = useQuery({
    queryKey: ["test-exams", search, page],
    queryFn: () => api.get("/test-exams", { params: { search, page, per_page: 15 } }).then(r => r.data),
  })

  const exams = data?.data?.data || []
  const totalPages = data?.data?.last_page || 1

  const examMutation = useMutation({
    mutationFn: (fd) => editingExamId ? api.put(`/test-exams/${editingExamId}`, fd) : api.post("/test-exams", fd),
    onSuccess: () => { toast.success(editingExamId ? "Exam updated" : "Exam created"); queryClient.invalidateQueries({ queryKey: ["test-exams"] }); setExamDialogOpen(false); setEditExamOpen(false); setEditingExamId(null); resetExamForm() },
    onError: (err) => toast.error(err.response?.data?.message || "Failed"),
  })

  const studentMutation = useMutation({
    mutationFn: () => api.post(`/test-exams/${selectedExam?.id}/students`, { students: studentForm }),
    onSuccess: () => { toast.success("Students added"); queryClient.invalidateQueries({ queryKey: ["test-exams"] }); setStudentDialogOpen(false) },
    onError: (err) => toast.error(err.response?.data?.message || "Failed"),
  })

  const analyzeMutation = useMutation({
    mutationFn: () => api.post(`/test-exams/${selectedExam?.id}/analyze`),
    onSuccess: () => { toast.success("Analysis complete"); queryClient.invalidateQueries({ queryKey: ["test-exams"] }); queryClient.invalidateQueries({ queryKey: ["test-analysis", selectedExam?.id] }) },
    onError: (err) => toast.error(err.response?.data?.message || "Failed"),
  })

  const { data: analysisData } = useQuery({
    queryKey: ["test-analysis", selectedExam?.id],
    enabled: analysisOpen && !!selectedExam?.id,
    queryFn: () => api.get(`/test-exams/${selectedExam?.id}/analysis`).then(r => r.data),
  })

  const analysis = analysisData?.data?.items || []
  const summary = analysisData?.data?.summary || { retain: 0, revise: 0, reject: 0 }
  const students = analysisData?.data?.students || []
  const examItems = selectedExam?.items || []

  const resetExamForm = () => setExamForm({ title: "", description: "", subject: "", items: [{ item_number: 1, question: "", correct_answer: "", item_type: "multiple_choice", options: null }] })
  const addItem = () => setExamForm({ ...examForm, items: [...examForm.items, { item_number: examForm.items.length + 1, question: "", correct_answer: "", item_type: "multiple_choice", options: null }] })

  const openStudentForm = async (exam) => {
    const res = await api.get(`/test-exams/${exam.id}`)
    const fullExam = res.data?.data
    setSelectedExam(fullExam)
    const answers = (fullExam.items || []).map(item => ({ item_id: item.id, answer: "" }))
    setStudentForm([{ name: "", answers }])
    setStudentDialogOpen(true)
  }

  const addStudentRow = () => {
    const answers = (selectedExam?.items || []).map(item => ({ item_id: item.id, answer: "" }))
    setStudentForm([...studentForm, { name: "", answers }])
  }

  const chartData = analysis.map(a => ({
    name: `Item ${a.item_number || ""}`,
    difficulty: Number(a.difficulty_index || 0),
    discrimination: Number(a.discrimination_index || 0),
  }))

  const renderTallyHeader = (itemOptions) => {
    const optionCount = itemOptions.length
    return (
      <TableRow>
        <TableHead rowSpan={2} className="border w-[50px] text-center">Item No.</TableHead>
        <TableHead rowSpan={2} className="border w-[80px] text-center">Level<br/>(27%)</TableHead>
        <TableHead colSpan={optionCount} className="border text-center">Multiple Choice</TableHead>
        <TableHead colSpan={2} className="border text-center">Tally</TableHead>
        <TableHead rowSpan={2} className="border w-[50px] text-center">Df</TableHead>
        <TableHead rowSpan={2} className="border w-[60px] text-center">Int</TableHead>
        <TableHead rowSpan={2} className="border w-[50px] text-center">Ds</TableHead>
        <TableHead rowSpan={2} className="border w-[60px] text-center">Int</TableHead>
        <TableHead rowSpan={2} className="border text-center">Action/Remark</TableHead>
      </TableRow>
    )
  }

  const renderTallySubHeader = (itemOptions) => (
    <TableRow>
      {itemOptions.map((opt, i) => (
        <TableHead key={i} className="border text-center w-[50px]">{opt}</TableHead>
      ))}
      <TableHead className="border text-center w-[40px]">f</TableHead>
      <TableHead className="border text-center w-[40px]">p</TableHead>
    </TableRow>
  )

  const renderTallyRows = (analysisItems, examItems) => {
    if (!analysisItems || analysisItems.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
            Run analysis first to see results
          </TableCell>
        </TableRow>
      )
    }
    return analysisItems.flatMap((a) => {
      const itemOptions = getItemOptions(a)
      const upperCount = a.upper_choices || {}
      const lowerCount = a.lower_choices || {}
      const upperProp = a.ua_proportion || 0
      const lowerProp = a.la_proportion || 0
      const totalPerOption = {}
      itemOptions.forEach(opt => {
        totalPerOption[opt] = (upperCount[opt] || 0) + (lowerCount[opt] || 0)
      })
      return [
        <TableRow key={a.item_id}>
          <TableCell className="border text-center font-medium" rowSpan={2}>{a.item_number}</TableCell>
          <TableCell className="border text-center text-xs">Upper</TableCell>
          {itemOptions.map((opt, i) => (
              <TableCell key={i} className="border text-center text-xs">{upperCount[opt] ?? 0}</TableCell>
          ))}
          <TableCell className="border text-center text-xs">{a.ua_correct}</TableCell>
          <TableCell className="border text-center text-xs">{Number(upperProp).toFixed(2)}</TableCell>
          <TableCell className="border text-center text-xs" rowSpan={2}>
            <div className="font-medium">{Number(a.difficulty_index).toFixed(2)}</div>
          </TableCell>
          <TableCell className="border text-center text-xs" rowSpan={2}>
            <div className="text-xs">{a.difficulty_level}</div>
          </TableCell>
          <TableCell className="border text-center text-xs" rowSpan={2}>
            <div className="font-medium">{Number(a.discrimination_index).toFixed(2)}</div>
          </TableCell>
          <TableCell className="border text-center text-xs" rowSpan={2}>
            <div className="text-xs">{a.discrimination_level}</div>
          </TableCell>
          <TableCell className="border text-center text-xs" rowSpan={2}>
            <Badge variant={actionColors[a.action] || "outline"} className="text-xs">{a.action}</Badge>
          </TableCell>
        </TableRow>,
        <TableRow key={`${a.item_id}-lower`}>
          <TableCell className="border text-center text-xs">Lower</TableCell>
          {itemOptions.map((opt, i) => (
              <TableCell key={i} className="border text-center text-xs">{lowerCount[opt] ?? 0}</TableCell>
          ))}
          <TableCell className="border text-center text-xs">{a.la_correct}</TableCell>
          <TableCell className="border text-center text-xs">{Number(lowerProp).toFixed(2)}</TableCell>
        </TableRow>
      ]
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Test Exams</h2>
        <Button onClick={() => { resetExamForm(); setExamDialogOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Create Exam
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search exams..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? <div className="text-center py-8 text-muted-foreground">Loading...</div>
          : exams.length === 0 ? <div className="text-center py-8 text-muted-foreground">No exams. Create a test exam first.</div>
          : (
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Subject</TableHead><TableHead>Items</TableHead><TableHead>Students</TableHead><TableHead>Analyzed</TableHead><TableHead className="w-[200px]">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {exams.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.title}</TableCell>
                    <TableCell>{e.subject || "-"}</TableCell>
                    <TableCell>{e.items_count || e.total_items || 0}</TableCell>
                    <TableCell>{e.students_count || 0}</TableCell>
                    <TableCell>{e.has_analysis ? <Badge variant="success">Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Button variant="ghost" size="icon" onClick={async () => { setEditingExamId(e.id); const res = await api.get(`/test-exams/${e.id}`); const ex = res.data?.data; setExamForm({ title: ex.title, description: ex.description || "", subject: ex.subject || "", items: (ex.items || []).map(it => ({ id: it.id, item_number: it.item_number, question: it.question || "", correct_answer: it.correct_answer || "", item_type: it.item_type || "multiple_choice", options: it.options || null })) }); setEditExamOpen(true) }} title="Edit"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => openStudentForm(e)}><Users className="mr-1 h-3 w-3" /> Students</Button>
                        {e.students_count >= 2 && (
                          <Button variant="outline" size="sm" onClick={() => { setSelectedExam(e); analyzeMutation.mutate() }} disabled={analyzeMutation.isPending}>
                            <Play className="mr-1 h-3 w-3" /> Analyze
                          </Button>
                        )}
                        {e.has_analysis && (
                          <Button variant="outline" size="sm" onClick={async () => { const res = await api.get(`/test-exams/${e.id}`); setSelectedExam(res.data?.data); setAnalysisOpen(true) }}>
                            <TrendingUp className="mr-1 h-3 w-3" /> Results
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Exam Dialog */}
      <Dialog open={examDialogOpen} onOpenChange={setExamDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Test Exam</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Title *" value={examForm.title} onChange={e => setExamForm({ ...examForm, title: e.target.value })} />
            <Input placeholder="Subject" value={examForm.subject} onChange={e => setExamForm({ ...examForm, subject: e.target.value })} />
            <Input placeholder="Description" value={examForm.description} onChange={e => setExamForm({ ...examForm, description: e.target.value })} />
            <div className="flex justify-between items-center"><Label className="font-semibold">Items</Label><Button size="sm" variant="outline" onClick={addItem}><Plus className="mr-1 h-3 w-3" /> Add Item</Button></div>
            {examForm.items.map((it, i) => (
              <div key={i} className="flex gap-2 items-center border rounded p-2 flex-wrap">
                <span className="text-xs text-muted-foreground w-12">{i + 1}.</span>
                <Input className="flex-1 min-w-[150px]" value={it.question} placeholder="Question" onChange={e => { const its = [...examForm.items]; its[i].question = e.target.value; its[i].item_number = i + 1; setExamForm({ ...examForm, items: its }) }} />
                <Select value={it.item_type || "multiple_choice"} onValueChange={v => { const its = [...examForm.items]; its[i].item_type = v; setExamForm({ ...examForm, items: its }) }}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="true_false">True/False</SelectItem>
                    <SelectItem value="identification">Fill in Blank</SelectItem>
                  </SelectContent>
                </Select>
                <Input className="w-24" value={it.correct_answer} placeholder="Key" onChange={e => { const its = [...examForm.items]; its[i].correct_answer = e.target.value; setExamForm({ ...examForm, items: its }) }} />
                {examForm.items.length > 1 && <Button variant="ghost" size="icon" onClick={() => setExamForm({ ...examForm, items: examForm.items.filter((_, idx) => idx !== i) })}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExamDialogOpen(false)}>Cancel</Button>
            <Button disabled={!examForm.title || examMutation.isPending} onClick={() => examMutation.mutate(examForm)}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editExamOpen} onOpenChange={setEditExamOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Exam</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Title" value={examForm.title} onChange={e => setExamForm({ ...examForm, title: e.target.value })} />
            <Input placeholder="Subject" value={examForm.subject} onChange={e => setExamForm({ ...examForm, subject: e.target.value })} />
            <Input placeholder="Description" value={examForm.description} onChange={e => setExamForm({ ...examForm, description: e.target.value })} />
            <div className="flex justify-between items-center"><Label className="font-semibold">Items</Label><Button size="sm" variant="outline" onClick={addItem}><Plus className="mr-1 h-3 w-3" /> Add</Button></div>
            {examForm.items.map((it, i) => (
              <div key={i} className="flex gap-2 items-center border rounded p-2 flex-wrap">
                <span className="text-xs text-muted-foreground w-12">{i + 1}.</span>
                <Input className="flex-1 min-w-[150px]" value={it.question} placeholder="Question" onChange={e => { const its = [...examForm.items]; its[i].question = e.target.value; setExamForm({ ...examForm, items: its }) }} />
                <Select value={it.item_type || "multiple_choice"} onValueChange={v => { const its = [...examForm.items]; its[i].item_type = v; setExamForm({ ...examForm, items: its }) }}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="true_false">True/False</SelectItem>
                    <SelectItem value="identification">Fill in Blank</SelectItem>
                  </SelectContent>
                </Select>
                <Input className="w-24" value={it.correct_answer} placeholder="Key" onChange={e => { const its = [...examForm.items]; its[i].correct_answer = e.target.value; setExamForm({ ...examForm, items: its }) }} />
                {examForm.items.length > 1 && <Button variant="ghost" size="icon" onClick={() => setExamForm({ ...examForm, items: examForm.items.filter((_, idx) => idx !== i) })}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditExamOpen(false)}>Cancel</Button>
            <Button disabled={!examForm.title || examMutation.isPending} onClick={() => examMutation.mutate(examForm)}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <span>Student Scores - {selectedExam?.title}</span>
              <span className="text-xs font-normal text-muted-foreground">{studentForm.length} student{studentForm.length !== 1 ? "s" : ""} • {selectedExam?.items?.length || 0} items</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto space-y-2 pr-2">
            <div className="border rounded p-2 bg-muted/30">
              <div className="text-xs font-medium text-muted-foreground mb-2">Student Names</div>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${studentForm.length}, minmax(150px, 1fr))` }}>
                {studentForm.map((student, si) => (
                  <div key={si} className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground font-medium w-6">{si + 1}.</span>
                    <Input className="h-8 text-sm" value={student.name} placeholder={`Student ${si + 1}`} onChange={e => { const sf = [...studentForm]; sf[si].name = e.target.value; setStudentForm(sf) }} />
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addStudentRow} className="h-8 w-8 p-0"><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            {(selectedExam?.items || []).map((item, itemIdx) => {
              const opts = item.options || (item.item_type === "true_false" ? ["True", "False"] : item.item_type === "identification" ? null : ["A", "B", "C", "D"])
              const hasOptions = opts && opts.length > 0
              return (
                <div key={item.id} className="border rounded p-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">Q{item.item_number}. {item.question || `Item ${item.item_number}`}</div>
                    <div className="text-xs text-muted-foreground">Key: <span className="font-mono font-medium">{item.correct_answer || "—"}</span></div>
                  </div>
                  <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${studentForm.length}, minmax(150px, 1fr))` }}>
                    {studentForm.map((student, si) => {
                      const ans = student.answers[itemIdx]?.answer || ""
                      const isCorrect = ans && ans === item.correct_answer
                      return (
                        <div key={si} className={`flex items-center gap-1 p-1 rounded ${ans ? (isCorrect ? "bg-green-50" : "bg-red-50") : "bg-gray-50"}`}>
                          <span className="text-xs text-muted-foreground w-6">{si + 1}.</span>
                          {hasOptions ? (
                            <div className="flex gap-1 flex-wrap">
                              {opts.map(o => (
                                <button key={o} className={`min-w-[28px] h-7 px-2 rounded border text-xs font-medium transition-colors ${ans === o ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted border-input"}`}
                                  onClick={() => { const sf = [...studentForm]; sf[si].answers[itemIdx].answer = o; setStudentForm(sf) }}>
                                  {o}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <Input className="h-7 text-xs" value={ans} onChange={e => { const sf = [...studentForm]; sf[si].answers[itemIdx].answer = e.target.value; setStudentForm(sf) }} placeholder="Answer" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="shrink-0 pt-2 border-t flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={addStudentRow}><Plus className="mr-1 h-3 w-3" /> Add Student</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStudentDialogOpen(false)}>Cancel</Button>
              <Button disabled={studentMutation.isPending} onClick={() => studentMutation.mutate()}>Save All</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Analysis Results Dialog */}
      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Analysis Results - {selectedExam?.title}</DialogTitle></DialogHeader>
          <Tabs defaultValue="results">
            <TabsList><TabsTrigger value="results">Item Analysis</TabsTrigger><TabsTrigger value="tally">Tally Sheet</TabsTrigger><TabsTrigger value="rankings">Rankings ({students.length})</TabsTrigger><TabsTrigger value="students">Students</TabsTrigger></TabsList>
            <TabsContent value="results" className="space-y-4 pt-4">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Retain</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{summary.retain}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Revise</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-600">{summary.revise}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Reject</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{summary.reject}</div></CardContent></Card>
              </div>
              {chartData.length > 0 && (
                <ResponsiveContainer width="100%" height={200} className="mb-4">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis domain={[0, 1]} />
                    <Tooltip />
                    <Bar dataKey="difficulty" fill="hsl(var(--primary))" name="Difficulty" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="discrimination" fill="#f59e0b" name="Discrimination" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>UA Correct</TableHead><TableHead>LA Correct</TableHead><TableHead>Difficulty</TableHead><TableHead>Discrimination</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {analysis.map(a => (
                    <TableRow key={a.item_id}>
                      <TableCell className="font-medium">#{a.item_number}</TableCell>
                      <TableCell>{a.ua_correct}/{a.ua_proportion}</TableCell>
                      <TableCell>{a.la_correct}/{a.la_proportion}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={dfColors[a.difficulty_level] || "outline"} className="text-xs">{a.difficulty_level}</Badge>
                          <div className="text-xs text-muted-foreground">{Number(a.difficulty_index).toFixed(2)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span className="text-xs">{a.discrimination_level}</span>
                          <div className="text-xs text-muted-foreground">{Number(a.discrimination_index).toFixed(2)}</div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={actionColors[a.action] || "outline"} className="text-xs">{a.action}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="tally" className="pt-4">
              <div className="text-xs text-muted-foreground mb-2">Tally: f = frequency, p = proportion</div>
              <div className="overflow-auto">
                {analysis.length > 0 ? (() => {
                  const opts = getItemOptions(analysis[0])
                  const totalTakers = analysis[0]?.ua_total + (analysis[0]?.la_total || 0) || students.length
                  const totalPerOption = {}
                  opts.forEach(o => totalPerOption[o] = 0)
                  analysis.forEach(a => {
                    const upper = a.upper_choices || {}
                    const lower = a.lower_choices || {}
                    opts.forEach(o => {
                      totalPerOption[o] += (upper[o] || 0) + (lower[o] || 0)
                    })
                  })
                  return (
                    <>
                      <Table>
                        <TableHeader>
                          {renderTallyHeader(opts)}
                          {renderTallySubHeader(opts)}
                        </TableHeader>
                        <TableBody>
                          {renderTallyRows(analysis, examItems)}
                          <TableRow className="bg-muted/50 font-medium">
                            <TableCell className="border text-center" rowSpan={2}>Total</TableCell>
                            <TableCell className="border text-center text-xs">All</TableCell>
                            {opts.map((o, i) => (
                              <TableCell key={i} className="border text-center text-xs">{totalPerOption[o]}</TableCell>
                            ))}
                            <TableCell className="border text-center text-xs">{analysis.reduce((s, a) => s + (a.ua_correct || 0) + (a.la_correct || 0), 0)}</TableCell>
                            <TableCell className="border text-center text-xs">—</TableCell>
                            <TableCell className="border text-center text-xs" rowSpan={2} colSpan={5}>Total Takers: {totalTakers}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </>
                  )
                })() : (
                  <div className="text-center py-8 text-muted-foreground">Run analysis first to see results</div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Number of takers: {students.length}</p>
            </TabsContent>
            <TabsContent value="rankings" className="pt-4">
              {(() => {
                const ranked = [...students].sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
                return ranked.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No student data</div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-4 text-sm text-muted-foreground mb-2">
                    <span>UA: Top 27%</span>
                    <span>LA: Bottom 27%</span>
                    <span>Total students: {ranked.length}</span>
                  </div>
                  <Table>
                    <TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Name</TableHead><TableHead>Score</TableHead><TableHead>%</TableHead><TableHead>Group</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {ranked.map((s, i) => (
                        <TableRow key={s.id} className={s.group === "UA" ? "bg-green-50" : s.group === "LA" ? "bg-red-50" : ""}>
                          <TableCell className="font-medium">#{i + 1}</TableCell>
                          <TableCell>{s.name}</TableCell>
                          <TableCell>{s.total_score || s.correct_count}</TableCell>
                          <TableCell>{Number(s.percentage || 0).toFixed(0)}%</TableCell>
                          <TableCell>
                            {s.group ? <Badge variant={s.group === "UA" ? "success" : "destructive"}>{s.group}</Badge> : <Badge variant="outline">-</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
              })()}
            </TabsContent>
            <TabsContent value="students" className="pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{students.length} students ({students.filter(s => s.group === "UA").length} UA, {students.filter(s => s.group === "LA").length} LA)</span>
                <Button size="sm" onClick={async () => { const res = await api.get(`/test-exams/${selectedExam?.id}`); openStudentForm(res.data?.data) }}><Users className="mr-1 h-3 w-3" /> Add/Edit</Button>
              </div>
              {students.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No students yet.</div>
              ) : (
                <div className="max-h-[60vh] overflow-auto space-y-4">
                  {["UA", "LA", ""].filter(g => students.some(s => s.group === g)).map(group => {
                    const groupStudents = students.filter(s => s.group === group)
                    if (groupStudents.length === 0) return null
                    return (
                      <div key={group}>
                        <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                          {group === "UA" ? <Badge variant="success">Upper Achievers (Top 27%)</Badge>
                          : group === "LA" ? <Badge variant="destructive">Lower Achievers (Bottom 27%)</Badge>
                          : <Badge variant="outline">Middle Group</Badge>}
                          <span className="text-xs text-muted-foreground">({groupStudents.length} students)</span>
                        </h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[40px]">#</TableHead>
                              <TableHead className="w-[120px]">Name</TableHead>
                              {examItems.map(it => <TableHead key={it.id} className="text-center w-[55px]">Q{it.item_number}</TableHead>)}
                              <TableHead className="text-right">Score</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {groupStudents.map((s, i) => (
                              <TableRow key={s.id}>
                                <TableCell className="font-medium">{i + 1}</TableCell>
                                <TableCell className="text-xs">{s.name}</TableCell>
                                {examItems.map(it => {
                                  const ans = (s.answers || []).find(a => a.test_item_id === it.id)
                                  return <TableCell key={it.id} className="text-center text-xs">{ans?.answer || "-"}</TableCell>
                                })}
                                <TableCell className="text-right font-medium">{s.total_score || s.correct_count}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}
