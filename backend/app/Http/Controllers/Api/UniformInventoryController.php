<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UniformInventory;
use Illuminate\Http\Request;

class UniformInventoryController extends Controller
{
    public function index(Request $request)
    {
        $query = UniformInventory::orderBy('description')->orderBy('date','desc');
        if ($request->filled('search')) {
            $s=$request->search;
            $query->where('description','like',"%{$s}%");
        }
        return $this->success($query->paginate($request->get('per_page',15)));
    }
    public function store(Request $request)
    {
        $request->validate(['date'=>'nullable|date','description'=>'required|string|max:255','beg_balance'=>'nullable|numeric|min:0','unit'=>'nullable|string|max:20','date_out'=>'nullable|date','qty_out'=>'nullable|numeric|min:0','date_in'=>'nullable|date','qty_in'=>'nullable|numeric|min:0','remarks'=>'nullable|string|max:500']);
        $data=$request->only(['date','description','beg_balance','unit','date_out','qty_out','date_in','qty_in','remarks']);
        $data['created_by']=$request->user()->id;
        return $this->success(UniformInventory::create($data),'Uniform created',201);
    }
    public function show($id){ return $this->success(UniformInventory::findOrFail($id)); }
    public function update(Request $request,$id){
        $item=UniformInventory::findOrFail($id);
        $request->validate(['date'=>'nullable|date','description'=>'sometimes|required|string|max:255','beg_balance'=>'nullable|numeric|min:0','unit'=>'nullable|string|max:20','date_out'=>'nullable|date','qty_out'=>'nullable|numeric|min:0','date_in'=>'nullable|date','qty_in'=>'nullable|numeric|min:0','remarks'=>'nullable|string|max:500']);
        $item->update($request->only(['date','description','beg_balance','unit','date_out','qty_out','date_in','qty_in','remarks']));
        return $this->success($item,'Uniform updated');
    }
    public function destroy($id){ UniformInventory::findOrFail($id)->delete(); return $this->success(null,'Uniform deleted'); }
    public function stats(){ return $this->success(['total'=>UniformInventory::count(),'low'=>UniformInventory::where('total_balance','<=',10)->count(),'out'=>UniformInventory::where('total_balance',0)->count()]); }
}
