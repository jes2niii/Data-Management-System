<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PropertySummary;
use Illuminate\Http\Request;

class PropertySummaryController extends Controller
{
    public function index(Request $request)
    {
        $query = PropertySummary::orderBy('month_year','desc')->orderBy('property_code');
        if ($request->filled('search')) {
            $s=$request->search;
            $query->where(function($q) use ($s){ $q->where('property_code','like',"%{$s}%")->orWhere('property_name','like',"%{$s}%"); });
        }
        if ($request->filled('month_year')) $query->where('month_year','like',"%{$request->month_year}%");
        if ($request->filled('status')) $query->where('status','like',"%{$request->status}%");
        return $this->success($query->paginate($request->get('per_page',15)));
    }
    public function store(Request $request)
    {
        $request->validate(['month_year'=>'required|string|max:50','property_code'=>'required|string|max:50','property_name'=>'required|string|max:255','description'=>'nullable|string|max:500','serial_number'=>'nullable|string|max:100','date_checked'=>'nullable|date','status'=>'nullable|string|max:50']);
        $data=$request->only(['month_year','property_code','property_name','description','serial_number','date_checked','status']);
        $data['created_by']=$request->user()->id;
        return $this->success(PropertySummary::create($data),'Property summary created',201);
    }
    public function show($id){ return $this->success(PropertySummary::findOrFail($id)); }
    public function update(Request $request,$id){
        $item=PropertySummary::findOrFail($id);
        $request->validate(['month_year'=>'sometimes|required|string|max:50','property_code'=>'sometimes|required|string|max:50','property_name'=>'sometimes|required|string|max:255','description'=>'nullable|string|max:500','serial_number'=>'nullable|string|max:100','date_checked'=>'nullable|date','status'=>'nullable|string|max:50']);
        $item->update($request->only(['month_year','property_code','property_name','description','serial_number','date_checked','status']));
        return $this->success($item,'Property summary updated');
    }
    public function destroy($id){ PropertySummary::findOrFail($id)->delete(); return $this->success(null,'Property summary deleted'); }
    public function stats(){ return $this->success(['total'=>PropertySummary::count(),'by_status'=>PropertySummary::selectRaw('status, COUNT(*) as count')->groupBy('status')->get(),'by_month'=>PropertySummary::selectRaw('month_year, COUNT(*) as count')->groupBy('month_year')->orderBy('month_year','desc')->limit(6)->get()]); }
}
