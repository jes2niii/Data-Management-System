import { useState, useEffect, useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import api from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Camera, Save, Lock, Calendar, Shield, User as UserIcon,
} from "lucide-react"

const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
})

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(6, "Must be at least 6 characters"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })

export default function ProfilePage() {
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    },
  })

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  })

  const { reset: resetProfile } = profileForm

  useEffect(() => {
    resetProfile({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    })
    setPhotoPreview(user?.photo_url || user?.avatar || null)
  }, [user, resetProfile])

  const profileMutation = useMutation({
    mutationFn: (formData) =>
      api.post("/profile/update", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: (response) => {
      toast.success("Profile updated")
      const updatedUser = response.data?.user || response.data
      if (updatedUser) {
        localStorage.setItem("user", JSON.stringify(updatedUser))
      }
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update"),
  })

  const passwordMutation = useMutation({
    mutationFn: (data) => api.post("/profile/change-password", data),
    onSuccess: () => {
      toast.success("Password changed successfully")
      passwordForm.reset()
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to change password"),
  })

  const onProfileSubmit = (data) => {
    const formData = new FormData()
    formData.append("name", data.name)
    formData.append("email", data.email)
    if (data.phone) formData.append("phone", data.phone)
    if (photo) formData.append("photo", photo)
    profileMutation.mutate(formData)
  }

  const onPasswordSubmit = (data) => {
    passwordMutation.mutate({
      current_password: data.current_password,
      new_password: data.new_password,
      new_password_confirmation: data.confirm_password,
    })
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhoto(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={photoPreview || ""} />
                <AvatarFallback className="text-2xl">
                  {(user?.name || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground shadow"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user?.name}</h2>
              <p className="text-muted-foreground">{user?.role?.name || "User"}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {user?.department?.name || ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" {...profileForm.register("name")} />
              {profileForm.formState.errors.name && (
                <p className="text-sm text-destructive">{profileForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...profileForm.register("email")} />
                {profileForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{profileForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...profileForm.register("phone")} />
              </div>
            </div>
            <Button type="submit" disabled={profileMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {profileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </form>
      </Card>

      <Card>
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Current Password</Label>
              <Input id="current_password" type="password" {...passwordForm.register("current_password")} />
              {passwordForm.formState.errors.current_password && (
                <p className="text-sm text-destructive">{passwordForm.formState.errors.current_password.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <Input id="new_password" type="password" {...passwordForm.register("new_password")} />
                {passwordForm.formState.errors.new_password && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.new_password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm Password</Label>
                <Input id="confirm_password" type="password" {...passwordForm.register("confirm_password")} />
                {passwordForm.formState.errors.confirm_password && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.confirm_password.message}</p>
                )}
              </div>
            </div>
            <Button type="submit" disabled={passwordMutation.isPending}>
              <Lock className="mr-2 h-4 w-4" />
              {passwordMutation.isPending ? "Updating..." : "Change Password"}
            </Button>
          </CardContent>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Role:</span>
              <span>{user?.role?.name || "User"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Department:</span>
              <span>{user?.department?.name || "-"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Last Login:</span>
              <span>
                {user?.last_login_at
                  ? format(new Date(user.last_login_at), "MMM dd, yyyy h:mm a")
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Account Created:</span>
              <span>
                {user?.created_at
                  ? format(new Date(user.created_at), "MMM dd, yyyy")
                  : "N/A"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
