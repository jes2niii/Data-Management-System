import { useState, useEffect, useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import api, { resolveFileUrl } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { passwordSchema, profileSchema } from "@/lib/profile-validation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Camera, Save, Lock, Calendar, Shield, User as UserIcon,
} from "lucide-react"

export default function ProfilePage() {
  const { user, updateUser, clearSession } = useAuth()
  const navigate = useNavigate()
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
  }, [user, resetProfile])

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null)
      return
    }
    const url = URL.createObjectURL(photo)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const savedPhoto = resolveFileUrl(user?.photo_url || user?.avatar || (user?.photo ? `/storage/${user.photo}` : null))

  const profileMutation = useMutation({
    mutationFn: (data) => {
      if (!photo) return api.put("/profile", data)
      const formData = new FormData()
      formData.append("_method", "PUT")
      for (const [field, value] of Object.entries(data)) formData.append(field, value ?? "")
      formData.append("photo", photo)
      return api.post("/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    },
    onSuccess: (response) => {
      updateUser(response.data.data)
      setPhoto(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      toast.success("Profile updated")
    },
    onError: (err) => {
      const errors = err.response?.data?.errors
      for (const field of ["name", "email", "phone"]) {
        if (errors?.[field]?.[0]) profileForm.setError(field, { message: errors[field][0] })
      }
      toast.error(errors?.photo?.[0] || err.response?.data?.message || "Failed to update profile")
    },
  })

  const passwordMutation = useMutation({
    mutationFn: (data) => api.put("/profile", data),
    onSuccess: () => {
      passwordForm.reset()
      clearSession()
      navigate("/login", { replace: true })
      toast.success("Password changed. Sign in with your new password.")
    },
    onError: (err) => {
      const errors = err.response?.data?.errors
      if (errors?.current_password?.[0]) passwordForm.setError("current_password", { message: errors.current_password[0] })
      if (errors?.password?.[0]) passwordForm.setError("new_password", { message: errors.password[0] })
      toast.error(err.response?.data?.message || "Failed to change password")
    },
  })

  const onProfileSubmit = (data) => profileMutation.mutate({ ...data, phone: data.phone || null })

  const onPasswordSubmit = (data) => {
    passwordMutation.mutate({
      current_password: data.current_password,
      password: data.new_password,
      password_confirmation: data.confirm_password,
    })
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        e.target.value = ""
        toast.error("Choose an image no larger than 2 MB.")
        return
      }
      setPhoto(file)
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
                <AvatarImage src={photoPreview || savedPhoto || undefined} alt={`${user?.name || "Account"} avatar`} />
                <AvatarFallback className="text-2xl">
                  {(user?.name || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                aria-label="Choose profile photo"
                disabled={profileMutation.isPending}
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
            <div className="grid gap-4 sm:grid-cols-2">
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
                {profileForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">{profileForm.formState.errors.phone.message}</p>
                )}
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
            <CardDescription>Changing your password signs you out of all devices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Current Password</Label>
              <Input id="current_password" type="password" autoComplete="current-password" {...passwordForm.register("current_password")} />
              {passwordForm.formState.errors.current_password && (
                <p className="text-sm text-destructive">{passwordForm.formState.errors.current_password.message}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <Input id="new_password" type="password" autoComplete="new-password" {...passwordForm.register("new_password")} />
                {passwordForm.formState.errors.new_password && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.new_password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm Password</Label>
                <Input id="confirm_password" type="password" autoComplete="new-password" {...passwordForm.register("confirm_password")} />
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
