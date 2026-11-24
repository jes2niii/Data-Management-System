import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import api from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { hasPermission } from "@/lib/access"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Play, RotateCcw } from "lucide-react"

const actionColors = { Retain: "success", Revise: "warning", Reject: "destructive" }
const dfColors = {
  "Very Difficult": "destructive", Difficult: "destructive",
  "Moderately Difficult": "warning", Easy: "success", "Very Easy": "success",
}

export default function QuickItemAnalysis() {
  const { user } = useAuth()
  const canAnalyze = hasPermission(user, "items.update")
  const [studentCount, setStudentCount] = useState(5)
  const [itemCount, setItemCount] = useState(10)
  const [matrix, setMatrix] = useState([])
  const [result, setResult] = useState(null)

  const mutation = useMutation({
    mutationFn: (payload) => api.post("/item-analysis/quick", payload).then((r) => r.data.data),
    onSuccess: (data) => { setResult(data); toast.success("Analysis computed") },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to compute analysis"),
  })

  if (!canAnalyze) return null

  const generate = () => {
    const students = Math.max(2, Math.min(100, Number(studentCount) || 2))
    const items = Math.max(1, Math.min(50, Number(itemCount) || 1))
    setStudentCount(students)
    setItemCount(items)
    setMatrix(Array.from({ length: students }, () => Array.from({ length: items }, () => false)))
    setResult(null)
  }

  const toggle = (student, item) => setMatrix((current) => current.map((row, rowIndex) =>
    rowIndex === student ? row.map((value, column) => column === item ? !value : value) : row))

  const reset = () => { setMatrix([]); setResult(null) }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Item Analysis</CardTitle>
        <CardDescription>
          Enter the number of students and items, mark each answer correct or incorrect, then compute
          using the same 27% upper/lower grouping, difficulty index, discrimination index and action rules
          as the detailed exam analysis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="quickStudents">Number of students</Label>
            <Input
              id="quickStudents"
              type="number"
              min="2"
              max="100"
              className="w-32"
              value={studentCount}
              onChange={(e) => setStudentCount(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="quickItems">Number of items</Label>
            <Input
              id="quickItems"
              type="number"
              min="1"
              max="50"
              className="w-32"
              value={itemCount}
              onChange={(e) => setItemCount(e.target.value)}
            />
          </div>
          <Button onClick={generate}><RotateCcw className="mr-2 h-4 w-4" /> Generate Tally</Button>
          {matrix.length > 0 && <Button variant="outline" onClick={reset}>Clear</Button>}
        </div>

        {matrix.length === 0 ? (
          <p className="text-sm text-muted-foreground">Generate a tally sheet to begin.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background">Student</TableHead>
                    {matrix[0].map((_, item) => (
                      <TableHead key={item} className="text-center min-w-[48px]">Item {item + 1}</TableHead>
                    ))}
                    <TableHead className="text-center">Total Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matrix.map((row, student) => (
                    <TableRow key={student}>
                      <TableCell className="sticky left-0 bg-background font-medium">Student {student + 1}</TableCell>
                      {row.map((correct, item) => (
                        <TableCell key={item} className="text-center">
                          <Button
                            variant={correct ? "success" : "outline"}
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Student ${student + 1}, item ${item + 1}: ${correct ? "correct" : "incorrect"}`}
                            onClick={() => toggle(student, item)}
                          >
                            {correct ? "✓" : "×"}
                          </Button>
                        </TableCell>
                      ))}
                      <TableCell className="text-center font-semibold">{row.filter(Boolean).length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button
              onClick={() => mutation.mutate({ student_count: studentCount, item_count: itemCount, results: matrix })}
              disabled={mutation.isPending}
            >
              <Play className="mr-2 h-4 w-4" /> {mutation.isPending ? "Computing..." : "Compute Analysis"}
            </Button>
          </>
        )}

        {result && (
          <div className="space-y-6 border-t pt-4">
            <div className="flex flex-wrap gap-3">
              <Badge variant="success">Retain: {result.summary.retain}</Badge>
              <Badge variant="warning">Revise: {result.summary.revise}</Badge>
              <Badge variant="destructive">Reject: {result.summary.reject}</Badge>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Students</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Correct</TableHead>
                      <TableHead>Incorrect</TableHead>
                      <TableHead>Total Score</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Group</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.students.map((student) => (
                      <TableRow key={student.student_number}>
                        <TableCell className="font-medium">Student {student.student_number}</TableCell>
                        <TableCell>{student.items_correct}</TableCell>
                        <TableCell>{student.items_incorrect}</TableCell>
                        <TableCell className="font-semibold">{student.total_score}</TableCell>
                        <TableCell>{student.percentage}%</TableCell>
                        <TableCell>{student.group || <span className="text-muted-foreground">—</span>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Item Analysis</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>UA Correct</TableHead>
                      <TableHead>LA Correct</TableHead>
                      <TableHead>Df Index</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Discrimination</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.items.map((item) => (
                      <TableRow key={item.item_number}>
                        <TableCell className="font-medium">#{item.item_number}</TableCell>
                        <TableCell>{item.ua_correct}/{item.ua_total}</TableCell>
                        <TableCell>{item.la_correct}/{item.la_total}</TableCell>
                        <TableCell>{Number(item.difficulty_index).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={dfColors[item.difficulty_level] || "outline"} className="text-xs">
                            {item.difficulty_level}
                          </Badge>
                        </TableCell>
                        <TableCell>{Number(item.discrimination_index).toFixed(2)}</TableCell>
                        <TableCell className="text-xs">{item.discrimination_level}</TableCell>
                        <TableCell>
                          <Badge variant={actionColors[item.action] || "outline"} className="text-xs">{item.action}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
