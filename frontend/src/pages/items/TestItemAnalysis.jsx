import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import api from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { hasPermission } from "@/lib/access"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Plus, Trash2, Search, TrendingUp, Play, Users, Pencil, MoreHorizontal, ClipboardList, UserCircle } from "lucide-react"
import { chartTooltipContentStyle, chartTooltipLabelStyle, chartTooltipItemStyle, chartBarCursor } from "@/lib/chart-theme"
import QuickItemAnalysis from "./QuickItemAnalysis"

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
  const { user } = useAuth()
  const canDelete = hasPermission(user, "items.delete")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [examDialogOpen, setExamDialogOpen] = useState(false)
  const [editExamOpen, setEditExamOpen] = useState(false)
  const [studentDialogOpen, setStudentDialogOpen] = useState(false)
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [selectedExam, setSelectedExam] = useState(null)
  const [editingExamId, setEditingExamId] = useState(null)
  const [examForm, setExamForm] = useState({ title: "", description: "", subject: "", items: [{ item_number: 1, question: "", correct_answer: "", item_type: "multiple_choice", options: null }] })
  const [itemsLocked, setItemsLocked] = useState(false)
  const [studentForm, setStudentForm] = useState([{ name: "", answers: [] }])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingExam, setDeletingExam] = useState(null)
  const [analysisFilter, setAnalysisFilter] = useState("all")
  const [analysisSearch, setAnalysisSearch] = useState("")
  const [showChart, setShowChart] = useState(false)
  const [tallyItemIndex, setTallyItemIndex] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ["test-exams", search, page],
    queryFn: () => api.get("/test-exams", { params: { search, page, per_page: 15 } }).then(r => r.data),
  })

  const exams = data?.data?.data || []
  const totalPages = data?.data?.last_page || 1

  const examMutation = useMutation({
    mutationFn: (fd) => editingExamId ? api.put(`/test-exams/${editingExamId}`, fd) : api.post("/test-exams", fd),
    onSuccess: () => {
      toast.success(editingExamId ? "Exam updated" : "Exam created")
      queryClient.invalidateQueries({ queryKey: ["test-exams"] })
      queryClient.invalidateQueries({ queryKey: ["test-analysis"] })
      setExamDialogOpen(false); setEditExamOpen(false); setEditingExamId(null); resetExamForm()
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed"),
  })

  const studentMutation = useMutation({
    mutationFn: () => api.post(`/test-exams/${selectedExam?.id}/students`, { students: studentForm }),
    onSuccess: () => {
      toast.success("Students added")
      queryClient.invalidateQueries({ queryKey: ["test-exams"] })
      queryClient.invalidateQueries({ queryKey: ["test-analysis", selectedExam?.id] })
      setStudentDialogOpen(false)
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed"),
  })

  const analyzeMutation = useMutation({
    mutationFn: (id) => api.post(`/test-exams/${id}/analyze`),
    onSuccess: (_, id) => { toast.success("Analysis complete"); queryClient.invalidateQueries({ queryKey: ["test-exams"] }); queryClient.invalidateQueries({ queryKey: ["test-analysis", id] }) },
    onError: (err) => toast.error(err.response?.data?.message || "Failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/test-exams/${id}`),
    onSuccess: () => {
      toast.success("Exam deleted")
      queryClient.invalidateQueries({ queryKey: ["test-exams"] })
      queryClient.invalidateQueries({ queryKey: ["test-analysis", deletingExam?.id] })
      if (deletingExam?.id === selectedExam?.id) {
        setSelectedExam(null)
        setAnalysisOpen(false)
      }
      setDeleteDialogOpen(false)
      setDeletingExam(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to delete exam"),
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

  const resetExamForm = () => {
    setItemsLocked(false)
    setExamForm({ title: "", description: "", subject: "", items: [{ item_number: 1, question: "", correct_answer: "", item_type: "multiple_choice", options: null }] })
  }
  const addItem = () => setExamForm({ ...examForm, items: [...examForm.items, { item_number: examForm.items.length + 1, question: "", correct_answer: "", item_type: "multiple_choice", options: null }] })

  const openStudentForm = async (exam) => {
    const res = await api.get(`/test-exams/${exam.id}`)
    const fullExam = res.data?.data
    setSelectedExam(fullExam)
    const answers = (fullExam.items || []).map(item => ({ item_id: item.id, answer: "" }))
    setStudentForm([{ name: "", answers }])
    setStudentDialogOpen(true)
  }

  const openExamEditor = async (exam) => {
    try {
      const { data: { data: current } } = await api.get(`/test-exams/${exam.id}`)
      const locked = (current.students?.length || 0) > 0 || current.has_analysis
      setEditingExamId(current.id)
      setItemsLocked(locked)
      setExamForm({
        title: current.title, description: current.description || "", subject: current.subject || "",
        items: (current.items || []).map((item) => ({
          id: item.id, item_number: item.item_number, question: item.question || "",
          correct_answer: item.correct_answer || "", item_type: item.item_type || "multiple_choice", options: item.options || null,
        })),
      })
      setEditExamOpen(true)
    } catch {
      toast.error("Could not load the exam. No edits were made.")
    }
  }

  const openResults = async (exam) => {
    try {
      const { data: { data: current } } = await api.get(`/test-exams/${exam.id}`)
      setSelectedExam(current)
      setAnalysisOpen(true)
    } catch {
      toast.error("Could not load the analysis.")
    }
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

  const visibleAnalysis = analysis.filter((item) => {
    const matchesAction = analysisFilter === "all" || item.action === analysisFilter
    const needle = analysisSearch.trim().toLowerCase()
    const matchesSearch = !needle || `item ${item.item_number} ${item.question || ""}`.toLowerCase().includes(needle)
    return matchesAction && matchesSearch
  })

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
        <Button onClick={() => { setEditingExamId(null); resetExamForm(); setExamDialogOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Create Exam
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search exams..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <QuickItemAnalysis />

      <Card>
        <CardContent className="pt-6">
          {isLoading ? <div className="text-center py-8 text-muted-foreground">Loading...</div>
          : exams.length === 0 ? <div className="text-center py-8 text-muted-foreground">No exams. Create a test exam first.</div>
          : (
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Subject</TableHead><TableHead>Items</TableHead><TableHead>Students</TableHead><TableHead>Analyzed</TableHead><TableHead className="w-[80px]">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {exams.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.title}</TableCell>
                    <TableCell>{e.subject || "-"}</TableCell>
                    <TableCell>{e.items_count || e.total_items || 0}</TableCell>
                    <TableCell>{e.students_count || 0}</TableCell>
                    <TableCell>{e.has_analysis ? <Badge variant="success">Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${e.title}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openExamEditor(e)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit exam
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openStudentForm(e)}>
                            <Users className="mr-2 h-4 w-4" /> Student scores
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => analyzeMutation.mutate(e.id)}
                            disabled={e.students_count < 2 || analyzeMutation.isPending}
                          >
                            <Play className="mr-2 h-4 w-4" /> Analyze
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openResults(e)} disabled={!e.has_analysis}>
                            <TrendingUp className="mr-2 h-4 w-4" /> View results
                          </DropdownMenuItem>
                          {canDelete && <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => { setDeletingExam(e); setDeleteDialogOpen(true) }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete exam
                            </DropdownMenuItem>
                          </>}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
            {(examForm.items || []).map((it, i) => (
              <div key={i} className="flex gap-2 items-center border rounded p-2 flex-wrap">
                <span className="text-xs text-muted-foreground w-12">{i + 1}.</span>
                <Input disabled={itemsLocked} className="flex-1 min-w-[150px]" value={it.question} placeholder="Question" onChange={e => { const its = [...examForm.items]; its[i].question = e.target.value; its[i].item_number = i + 1; setExamForm({ ...examForm, items: its }) }} />
                <Select disabled={itemsLocked} value={it.item_type || "multiple_choice"} onValueChange={v => { const its = [...examForm.items]; its[i].item_type = v; setExamForm({ ...examForm, items: its }) }}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="true_false">True/False</SelectItem>
                    <SelectItem value="identification">Fill in Blank</SelectItem>
                  </SelectContent>
                </Select>
                <Input disabled={itemsLocked} className="w-24" value={it.correct_answer} placeholder="Key" onChange={e => { const its = [...examForm.items]; its[i].correct_answer = e.target.value; setExamForm({ ...examForm, items: its }) }} />
                {!itemsLocked && examForm.items.length > 1 && <Button variant="ghost" size="icon" onClick={() => setExamForm({ ...examForm, items: examForm.items.filter((_, idx) => idx !== i) })}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
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
             {itemsLocked && <p role="status" className="text-sm text-muted-foreground">Items are locked because scores or analysis have been recorded.</p>}
             <div className="flex justify-between items-center">
               <Label className="font-semibold">Items</Label>
               {!itemsLocked && <Button size="sm" variant="outline" onClick={addItem}><Plus className="mr-1 h-3 w-3" /> Add</Button>}
             </div>
             {(examForm.items || []).map((it, i) => (
              <div key={i} className="flex gap-2 items-center border rounded p-2 flex-wrap">
                <span className="text-xs text-muted-foreground w-12">{i + 1}.</span>
                <Input disabled={itemsLocked} className="flex-1 min-w-[150px]" value={it.question} placeholder="Question" onChange={e => { const its = [...examForm.items]; its[i].question = e.target.value; setExamForm({ ...examForm, items: its }) }} />
                <Select disabled={itemsLocked} value={it.item_type || "multiple_choice"} onValueChange={v => { const its = [...examForm.items]; its[i].item_type = v; setExamForm({ ...examForm, items: its }) }}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="true_false">True/False</SelectItem>
                    <SelectItem value="identification">Fill in Blank</SelectItem>
                  </SelectContent>
                </Select>
                <Input disabled={itemsLocked} className="w-24" value={it.correct_answer} placeholder="Key" onChange={e => { const its = [...examForm.items]; its[i].correct_answer = e.target.value; setExamForm({ ...examForm, items: its }) }} />
                {!itemsLocked && examForm.items.length > 1 && <Button variant="ghost" size="icon" onClick={() => setExamForm({ ...examForm, items: examForm.items.filter((_, idx) => idx !== i) })}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditExamOpen(false)}>Cancel</Button>
             <Button disabled={!examForm.title || examMutation.isPending} onClick={() => {
               const { items, ...fields } = examForm
               examMutation.mutate(itemsLocked ? fields : { ...fields, items })
             }}>Update</Button>
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Analysis Results — {selectedExam?.title}</DialogTitle>
            <DialogDescription className="text-xs">
              {selectedExam?.total_items || examItems.length} items • {students.length} students •
              grouped into top and bottom 27% for the indices below
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="results" className="flex-1 min-h-0 flex flex-col">
            <TabsList className="shrink-0 sticky top-0 z-10 flex-wrap justify-start gap-1 rounded-none border-b bg-background/95 backdrop-blur px-0 py-1">
              <TabsTrigger value="results" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Item Analysis</TabsTrigger>
              <TabsTrigger value="tally" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" /> Tally Sheet</TabsTrigger>
              <TabsTrigger value="rankings" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Rankings ({students.length})</TabsTrigger>
              <TabsTrigger value="students" className="gap-1.5"><UserCircle className="h-3.5 w-3.5" /> Students ({students.length})</TabsTrigger>
            </TabsList>
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <TabsContent value="results" className="space-y-4 pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[180px] flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="h-9 pl-8 text-xs"
                    placeholder="Search item or question"
                    value={analysisSearch}
                    onChange={(e) => setAnalysisSearch(e.target.value)}
                  />
                </div>
                <Select value={analysisFilter} onValueChange={setAnalysisFilter}>
                  <SelectTrigger className="h-9 w-36 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    <SelectItem value="Retain">Retain</SelectItem>
                    <SelectItem value="Revise">Revise</SelectItem>
                    <SelectItem value="Reject">Reject</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setShowChart((value) => !value)}>
                  {showChart ? "Hide chart" : "Show chart"}
                </Button>
                <span className="ml-auto text-xs text-muted-foreground">{visibleAnalysis.length} of {analysis.length} items</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Retain</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{summary.retain}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Revise</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-600">{summary.revise}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Reject</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{summary.reject}</div></CardContent></Card>
              </div>
              {showChart && chartData.length > 0 && (
                <ResponsiveContainer width="100%" height={200} className="mb-4">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis domain={[0, 1]} />
                    <Tooltip contentStyle={chartTooltipContentStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} cursor={chartBarCursor} />
                    <Bar dataKey="difficulty" fill="var(--primary)" name="Difficulty" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="discrimination" fill="var(--chart-2)" name="Discrimination" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Question</TableHead><TableHead className="text-center">UA Correct</TableHead><TableHead className="text-center">LA Correct</TableHead><TableHead>Difficulty</TableHead><TableHead>Discrimination</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {visibleAnalysis.map(a => (
                    <TableRow key={a.item_id}>
                      <TableCell className="font-medium">#{a.item_number}</TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground" title={a.question || ""}>{a.question || "—"}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{a.ua_correct}/{a.ua_total}</span>
                        <span className="block text-xs text-muted-foreground">{Number(a.ua_proportion).toFixed(2)}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{a.la_correct}/{a.la_total}</span>
                        <span className="block text-xs text-muted-foreground">{Number(a.la_proportion).toFixed(2)}</span>
                      </TableCell>
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
                  {visibleAnalysis.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No items match these filters.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="tally" className="pt-4">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="text-xs text-muted-foreground">Tally: f = frequency, p = proportion</span>
                {analysis.length > 0 && (
                  <Select value={String(Math.min(tallyItemIndex, analysis.length - 1))} onValueChange={(value) => setTallyItemIndex(Number(value))}>
                    <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {analysis.map((item, index) => (
                        <SelectItem key={item.item_id} value={String(index)}>Item {item.item_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <span className="ml-auto text-xs text-muted-foreground">Showing one item at a time so each item keeps its own options</span>
              </div>
              <div className="overflow-auto">
                {analysis.length > 0 ? (() => {
                  const itemIndex = Math.min(tallyItemIndex, analysis.length - 1)
                  const tallyItem = analysis[itemIndex]
                  const opts = getItemOptions(tallyItem)
                  const upper = tallyItem.upper_choices || {}
                  const lower = tallyItem.lower_choices || {}
                  const totalPerOption = Object.fromEntries(opts.map((o) => [o, (upper[o] || 0) + (lower[o] || 0)]))
                  const totalTakers = (tallyItem.ua_total || 0) + (tallyItem.la_total || 0)
                  return (
                    <Table>
                      <TableHeader>
                        {renderTallyHeader(opts)}
                        {renderTallySubHeader(opts)}
                      </TableHeader>
                      <TableBody>
                        {renderTallyRows([tallyItem], examItems)}
                        <TableRow className="bg-muted/50 font-medium">
                          <TableCell className="border text-center" rowSpan={2}>Total</TableCell>
                          <TableCell className="border text-center text-xs">All</TableCell>
                          {opts.map((o, i) => (
                            <TableCell key={i} className="border text-center text-xs">{totalPerOption[o]}</TableCell>
                          ))}
                          <TableCell className="border text-center text-xs">{(tallyItem.ua_correct || 0) + (tallyItem.la_correct || 0)}</TableCell>
                          <TableCell className="border text-center text-xs">—</TableCell>
                          <TableCell className="border text-center text-xs" rowSpan={2} colSpan={5}>Total Takers: {totalTakers}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )
                })() : (
                  <div className="text-center py-8 text-muted-foreground">Run analysis first to see results</div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Students analyzed: {students.length}</p>
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
                                  const correct = ans && ans.answer && ans.answer === it.correct_answer
                                  return (
                                    <TableCell
                                      key={it.id}
                                      className={`text-center text-xs ${ans && ans.answer ? (correct ? "text-green-600" : "text-red-600") : "text-muted-foreground"}`}
                                      title={ans?.answer || "No answer"}
                                    >
                                      {ans?.answer || "—"}
                                    </TableCell>
                                  )
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
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete exam?</DialogTitle>
            <DialogDescription>
              {deletingExam?.title} and its recorded scores and analysis will be removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deletingExam.id)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
