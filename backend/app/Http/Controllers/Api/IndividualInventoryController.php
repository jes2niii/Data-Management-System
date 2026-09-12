<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IndividualInventory;
use Illuminate\Http\Request;

class IndividualInventoryController extends Controller
{
    public function index(Request $request)
    {
        $query = IndividualInventory::orderBy('employee_name')->orderBy('property_code');
        if ($request->filled('search')) {
            $s=$request->search;
            $query->where(function($q) use ($s){ $q->where('employee_name','like',"%{$s}%")->orWhere('property_code','like',"%{$s}%")->orWhere('property_name','like',"%{$s}%"); });
        }
        if ($request->filled('department')) $query->where('department','like',"%{$request->department}%");
        return $this->success($query->paginate($request->get('per_page',15)));
    }
    public function store(Request $request)
    {
        $request->validate(['employee_name'=>'required|string|max:255','department'=>'nullable|string|max:100','location'=>'nullable|string|max:100','date'=>'nullable|date','property_code'=>'required|string|max:50','property_name'=>'required|string|max:255','description'=>'nullable|string|max:500','serial_number'=>'nullable|string|max:100','control_no'=>'nullable|string|max:100','date_received'=>'nullable|date','remarks'=>'nullable|string|max:50']);
        $data=$request->only(['employee_name','department','location','date','property_code','property_name','description','serial_number','control_no','date_received','remarks']);
        $data['created_by']=$request->user()->id;
        return $this->success(IndividualInventory::create($data),'Individual inventory created',201);
    }
    public function show($id){ return $this->success(IndividualInventory::findOrFail($id)); }
    public function update(Request $request,$id){
        $item=IndividualInventory::findOrFail($id);
        $request->validate(['employee_name'=>'sometimes|required|string|max:255','department'=>'nullable|string|max:100','location'=>'nullable|string|max:100','date'=>'nullable|date','property_code'=>'sometimes|required|string|max:50','property_name'=>'sometimes|required|string|max:255','description'=>'nullable|string|max:500','serial_number'=>'nullable|string|max:100','control_no'=>'nullable|string|max:100','date_received'=>'nullable|date','remarks'=>'nullable|string|max:50']);
        $item->update($request->only(['employee_name','department','location','date','property_code','property_name','description','serial_number','control_no','date_received','remarks']));
        return $this->success($item,'Individual inventory updated');
    }
    public function destroy($id){ IndividualInventory::findOrFail($id)->delete(); return $this->success(null,'Individual inventory deleted'); }
    public function stats(){ return $this->success(['total'=>IndividualInventory::count(),'by_department'=>IndividualInventory::selectRaw('department, COUNT(*) as count')->groupBy('department')->get()]); }
}
