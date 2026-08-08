<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $query = Notification::where('user_id', $request->user()->id)
            ->orderByRaw('read_at IS NULL DESC')
            ->orderBy('created_at', 'desc');

        $notifications = $query->paginate($request->get('per_page', 15));

        return $this->success($notifications);
    }

    public function markAsRead($id)
    {
        $notification = Notification::where('user_id', request()->user()->id)
            ->where('id', $id)
            ->firstOrFail();

        $notification->update(['read_at' => now()]);

        return $this->success($notification, 'Notification marked as read');
    }

    public function markAllAsRead(Request $request)
    {
        Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return $this->success(null, 'All notifications marked as read');
    }

    public function unreadCount(Request $request)
    {
        $count = Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->count();

        return $this->success(['count' => $count]);
    }
}
