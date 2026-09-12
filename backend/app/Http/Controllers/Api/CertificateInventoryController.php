<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CertificateInventory;
use Illuminate\Http\Request;

class CertificateInventoryController extends Controller
{
    public function index(Request $request)
    {
        $query = CertificateInventory::orderBy('description')->orderBy('date','desc');
        if ($request->filled('search')) {
            $s=$request->search;
            $query->where(function($q) use ($s){ $q->where('description','like',"%{$s}%")->orWhere('tracking_no','like',"%{$s}%")->orWhere('tracking_no2','like',"%{$s}%"); });
        }
        return $this->success($query->paginate($request->get('per_page',15)));
    }
    public function store(Request $request)
    {
        $request->validate(['date'=>'nullable|date','description'=>'required|string|max:255','beg_balance'=>'nullable|numeric|min:0','unit'=>'nullable|string|max:20','tracking_no'=>'nullable|string|max:100','date_out'=>'nullable|date','qty_out'=>'nullable|numeric|min:0','tracking_no2'=>'nullable|string|max:100','date_in'=>'nullable|date','qty_in'=>'nullable|numeric|min:0','remarks'=>'nullable|string|max:500']);
        $data=$request->only(['date','description','beg_balance','unit','tracking_no','date_out','qty_out','tracking_no2','date_in','qty_in','remarks']);
        $data['created_by']=$request->user()->id;
        return $this->success(CertificateInventory::create($data),'Certificate created',201);
    }
    public function show($id){ return $this->success(CertificateInventory::findOrFail($id)); }
    public function update(Request $request,$id){
        $item=CertificateInventory::findOrFail($id);
        $request->validate(['date'=>'nullable|date','description'=>'sometimes|required|string|max:255','beg_balance'=>'nullable|numeric|min:0','unit'=>'nullable|string|max:20','tracking_no'=>'nullable|string|max:100','date_out'=>'nullable|date','qty_out'=>'nullable|numeric|min:0','tracking_no2'=>'nullable|string|max:100','date_in'=>'nullable|date','qty_in'=>'nullable|numeric|min:0','remarks'=>'nullable|string|max:500']);
        $item->update($request->only(['date','description','beg_balance','unit','tracking_no','date_out','qty_out','tracking_no2','date_in','qty_in','remarks']));
        return $this->success($item,'Certificate updated');
    }
    public function destroy($id){ CertificateInventory::findOrFail($id)->delete(); return $this->success(null,'Certificate deleted'); }
    public function stats(){ return $this->success(['total'=>CertificateInventory::count(),'low'=>CertificateInventory::where('total_balance','<=',10)->count()]); }
}
