'use client';

import { useState, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, Package, Layers, ChevronDown, ChevronUp, Save, X, Check, MoreHorizontal } from 'lucide-react';
import { useNavisol } from '@/lib/store';
import { formatEuroCurrency } from '@/lib/formatting';
import { CATEGORIES } from '@/lib/categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { ArticleGroup, ArticleGroupItem, Article, BoatModel, StandardOptional } from '@/lib/types';
import { DEFAULT_BOAT_MODELS } from '@/lib/types';

interface FormData {
  name: string;
  description: string;
  category: string;
  subcategory: string;
  items: ArticleGroupItem[];
  use_custom_price: boolean;
  custom_price_excl_vat: number;
  boat_model_compat: BoatModel[];
  standard_or_optional: StandardOptional;
  is_active: boolean;
  internal_sku: string;
  notes: string;
}

const INIT: FormData = { name: '', description: '', category: '', subcategory: '', items: [], use_custom_price: false, custom_price_excl_vat: 0, boat_model_compat: [], standard_or_optional: 'Optional', is_active: true, internal_sku: '', notes: '' };

export function ArticleGroupsManager() {
  const { articleGroups, articles, addArticleGroup, updateArticleGroup, deleteArticleGroup, calculateGroupPrice } = useNavisol();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<ArticleGroup | null>(null);
  const [form, setForm] = useState<FormData>(INIT);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [artSearch, setArtSearch] = useState('');
  const [showArtSel, setShowArtSel] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);

  const cats = useMemo(() => Array.from(new Set(articleGroups.map(g => g.category).filter(Boolean))).sort(), [articleGroups]);
  const filtered = useMemo(() => articleGroups.filter(g => (!search || g.name.toLowerCase().includes(search.toLowerCase())) && (catFilter === 'all' || g.category === catFilter)), [articleGroups, search, catFilter]);
  const subcats = useMemo(() => CATEGORIES.find(c => c.name === form.category)?.subcategories?.map(s => s.name) || [], [form.category]);
  const filteredArts = useMemo(() => (artSearch ? articles.filter(a => a.part_name.toLowerCase().includes(artSearch.toLowerCase())).slice(0, 50) : articles.slice(0, 50)), [articles, artSearch]);
  const calcPrice = useMemo(() => form.items.reduce((t, i) => { const a = articles.find(x => x.id === i.article_id); return a ? t + a.sales_price_excl_vat * i.quantity : t; }, 0), [form.items, articles]);
  const getArt = (id: string) => articles.find(a => a.id === id);

  const toggle = (id: string) => { const n = new Set(expanded); if (n.has(id)) { n.delete(id); } else { n.add(id); } setExpanded(n); };
  const openCreate = () => { setForm(INIT); setEditing(null); setShowDialog(true); };
  const openEdit = (g: ArticleGroup) => { setForm({ name: g.name, description: g.description || '', category: g.category, subcategory: g.subcategory, items: [...g.items], use_custom_price: g.use_custom_price, custom_price_excl_vat: g.custom_price_excl_vat || 0, boat_model_compat: [...g.boat_model_compat], standard_or_optional: g.standard_or_optional, is_active: g.is_active, internal_sku: g.internal_sku || '', notes: g.notes || '' }); setEditing(g); setShowDialog(true); };

  const save = () => {
    if (!form.name || !form.category || !form.subcategory) return;
    const data = { name: form.name, description: form.description || undefined, category: form.category, subcategory: form.subcategory, items: form.items, use_custom_price: form.use_custom_price, custom_price_excl_vat: form.use_custom_price ? form.custom_price_excl_vat : undefined, boat_model_compat: form.boat_model_compat, standard_or_optional: form.standard_or_optional, is_active: form.is_active, internal_sku: form.internal_sku || undefined, notes: form.notes || undefined };
    if (editing) { updateArticleGroup(editing.id, data); } else { addArticleGroup(data); }
    setShowDialog(false); setForm(INIT); setEditing(null);
  };

  const addArt = (a: Article) => {
    const idx = form.items.findIndex(i => i.article_id === a.id);
    if (idx >= 0) {
      setForm({ ...form, items: form.items.map((it, j) => j === idx ? { ...it, quantity: it.quantity + 1 } : it) });
    } else {
      setForm({ ...form, items: [...form.items, { article_id: a.id, quantity: 1 }] });
    }
  };
  const updQty = (id: string, q: number) => {
    if (q <= 0) {
      setForm({ ...form, items: form.items.filter(i => i.article_id !== id) });
    } else {
      setForm({ ...form, items: form.items.map(i => i.article_id === id ? { ...i, quantity: q } : i) });
    }
  };
  const remArt = (id: string) => setForm({ ...form, items: form.items.filter(i => i.article_id !== id) });
  const del = (id: string) => { deleteArticleGroup(id); setDelId(null); };
  const togModel = (m: BoatModel) => {
    if (form.boat_model_compat.includes(m)) {
      setForm({ ...form, boat_model_compat: form.boat_model_compat.filter(x => x !== m) });
    } else {
      setForm({ ...form, boat_model_compat: [...form.boat_model_compat, m] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-slate-900">Article Groups / Kits</h2><p className="text-slate-600 mt-1">Create and manage article groups that bundle multiple parts</p></div>
        <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4 mr-2" />Create Group</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 bg-teal-100 rounded-lg"><Layers className="w-5 h-5 text-teal-700" /></div><div><p className="text-2xl font-bold">{articleGroups.length}</p><p className="text-sm text-slate-600">Total Groups</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><Check className="w-5 h-5 text-green-700" /></div><div><p className="text-2xl font-bold">{articleGroups.filter(g => g.is_active).length}</p><p className="text-sm text-slate-600">Active</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 bg-orange-100 rounded-lg"><Package className="w-5 h-5 text-orange-700" /></div><div><p className="text-2xl font-bold">{articleGroups.reduce((s, g) => s + g.items.length, 0)}</p><p className="text-sm text-slate-600">Total Items</p></div></div></CardContent></Card>
      </div>

      <Card><CardContent className="pt-4"><div className="flex flex-col sm:flex-row gap-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div><Select value={catFilter} onValueChange={setCatFilter}><SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="all">All Categories</SelectItem>{cats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div></CardContent></Card>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><Layers className="w-12 h-12 text-slate-300 mx-auto mb-4" /><h3 className="text-lg font-medium mb-2">No Groups Found</h3><p className="text-slate-500 mb-4">{articleGroups.length === 0 ? 'Create your first group.' : 'No matches.'}</p>{articleGroups.length === 0 && <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4 mr-2" />Create</Button>}</CardContent></Card>
        ) : filtered.map(g => (
          <Card key={g.id}><Collapsible open={expanded.has(g.id)} onOpenChange={() => toggle(g.id)}>
            <div className="p-4 flex items-center justify-between gap-4 border-b border-slate-100">
              <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left hover:bg-slate-50 -m-2 p-2 rounded-lg">
                <div className="p-2 bg-teal-100 rounded-lg"><Layers className="w-5 h-5 text-teal-700" /></div>
                <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><h3 className="font-semibold truncate">{g.name}</h3>{!g.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}<Badge variant="outline" className="text-xs">{g.items.length} items</Badge></div><div className="text-sm text-slate-500">{g.category} - {g.subcategory}</div></div>
                <div className="text-right mr-4"><p className="font-semibold">{formatEuroCurrency(calculateGroupPrice(g))}</p><p className="text-xs text-slate-500">{g.use_custom_price ? 'Custom' : 'Calc'}</p></div>
                {expanded.has(g.id) ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </CollapsibleTrigger>
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openEdit(g)}><Edit className="w-4 h-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-red-600" onClick={() => setDelId(g.id)}><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
            </div>
            <CollapsibleContent><div className="p-4 bg-slate-50">{g.description && <p className="text-sm text-slate-600 mb-4">{g.description}</p>}<Table><TableHeader><TableRow><TableHead>Part</TableHead><TableHead>Cat</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{g.items.map(i => { const a = getArt(i.article_id); return a ? <TableRow key={i.article_id}><TableCell>{a.part_name}</TableCell><TableCell>{a.subcategory}</TableCell><TableCell className="text-right">{i.quantity}</TableCell><TableCell className="text-right">{formatEuroCurrency(a.sales_price_excl_vat)}</TableCell><TableCell className="text-right font-medium">{formatEuroCurrency(a.sales_price_excl_vat * i.quantity)}</TableCell></TableRow> : null; })}<TableRow className="bg-slate-100 font-semibold"><TableCell colSpan={4} className="text-right">{g.use_custom_price ? 'Custom:' : 'Total:'}</TableCell><TableCell className="text-right">{formatEuroCurrency(calculateGroupPrice(g))}</TableCell></TableRow></TableBody></Table>{g.boat_model_compat.length > 0 && <div className="mt-4 flex items-center gap-2"><span className="text-sm text-slate-600">Compatible:</span>{g.boat_model_compat.map(m => <Badge key={m} variant="outline" className="text-xs">{m}</Badge>)}</div>}</div></CollapsibleContent>
          </Collapsible></Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle>{editing ? 'Edit Group' : 'Create Group'}</DialogTitle><DialogDescription>Bundle parts into a group</DialogDescription></DialogHeader>
          <ScrollArea className="flex-1 pr-4"><div className="space-y-6 pb-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
              <div className="col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1" rows={2} /></div>
              <div><Label>Category *</Label><Select value={form.category} onValueChange={v => setForm({ ...form, category: v, subcategory: '' })}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Subcategory *</Label><Select value={form.subcategory} onValueChange={v => setForm({ ...form, subcategory: v })} disabled={!form.category}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{subcats.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>SKU</Label><Input value={form.internal_sku} onChange={e => setForm({ ...form, internal_sku: e.target.value })} className="mt-1" /></div>
              <div><Label>Type</Label><Select value={form.standard_or_optional} onValueChange={(v: StandardOptional) => setForm({ ...form, standard_or_optional: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Standard">Standard</SelectItem><SelectItem value="Optional">Optional</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label className="mb-2 block">Boat Models</Label><div className="flex flex-wrap gap-2">{DEFAULT_BOAT_MODELS.map(m => <Badge key={m} variant={form.boat_model_compat.includes(m) ? 'default' : 'outline'} className={`cursor-pointer ${form.boat_model_compat.includes(m) ? 'bg-teal-600' : ''}`} onClick={() => togModel(m)}>{m}</Badge>)}</div></div>
            <div><div className="flex items-center justify-between mb-2"><Label>Articles</Label><Button variant="outline" size="sm" onClick={() => setShowArtSel(!showArtSel)}><Plus className="w-4 h-4 mr-1" />Add</Button></div>
              {showArtSel && <Card className="mb-4 border-teal-200 bg-teal-50/50"><CardContent className="pt-4"><div className="relative mb-3"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" /><Input placeholder="Search..." value={artSearch} onChange={e => setArtSearch(e.target.value)} className="pl-10" /></div><ScrollArea className="h-[200px]"><div className="space-y-1">{filteredArts.map(a => { const added = form.items.some(i => i.article_id === a.id); return <div key={a.id} className={`flex items-center justify-between p-2 rounded-lg ${added ? 'bg-teal-100' : 'hover:bg-slate-100'}`}><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{a.part_name}</p><p className="text-xs text-slate-500">{a.subcategory} - {formatEuroCurrency(a.sales_price_excl_vat)}</p></div><Button variant={added ? 'secondary' : 'outline'} size="sm" onClick={() => addArt(a)}>{added ? <><Check className="w-3 h-3 mr-1" />Added</> : <><Plus className="w-3 h-3 mr-1" />Add</>}</Button></div>; })}</div></ScrollArea></CardContent></Card>}
              {form.items.length > 0 ? <Table><TableHeader><TableRow><TableHead>Part</TableHead><TableHead className="w-[100px] text-center">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="w-[60px]" /></TableRow></TableHeader><TableBody>{form.items.map(i => { const a = getArt(i.article_id); return a ? <TableRow key={i.article_id}><TableCell><p className="font-medium">{a.part_name}</p><p className="text-xs text-slate-500">{a.subcategory}</p></TableCell><TableCell><Input type="number" min="1" value={i.quantity} onChange={e => updQty(i.article_id, parseInt(e.target.value) || 1)} className="w-20 text-center" /></TableCell><TableCell className="text-right">{formatEuroCurrency(a.sales_price_excl_vat)}</TableCell><TableCell className="text-right font-medium">{formatEuroCurrency(a.sales_price_excl_vat * i.quantity)}</TableCell><TableCell><Button variant="ghost" size="icon" className="text-red-600" onClick={() => remArt(i.article_id)}><X className="w-4 h-4" /></Button></TableCell></TableRow> : null; })}<TableRow className="bg-slate-50 font-semibold"><TableCell colSpan={3} className="text-right">Calculated:</TableCell><TableCell className="text-right">{formatEuroCurrency(calcPrice)}</TableCell><TableCell /></TableRow></TableBody></Table> : <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed"><Package className="w-8 h-8 text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-500">No articles</p></div>}
            </div>
            <div className="border-t pt-4"><div className="flex items-center gap-2 mb-3"><Switch checked={form.use_custom_price} onCheckedChange={c => setForm({ ...form, use_custom_price: c })} /><Label>Custom price</Label></div>{form.use_custom_price && <div className="flex items-center gap-3 ml-10"><Label>Price:</Label><Input type="number" value={form.custom_price_excl_vat} onChange={e => setForm({ ...form, custom_price_excl_vat: parseFloat(e.target.value) || 0 })} className="w-32" /></div>}</div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={c => setForm({ ...form, is_active: c })} /><Label>Active</Label></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1" rows={2} /></div>
          </div></ScrollArea>
          <DialogFooter className="border-t pt-4"><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={save} disabled={!form.name || !form.category || !form.subcategory} className="bg-teal-600 hover:bg-teal-700"><Save className="w-4 h-4 mr-2" />{editing ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!delId} onOpenChange={() => setDelId(null)}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Delete Group</DialogTitle><DialogDescription>This cannot be undone.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDelId(null)}>Cancel</Button><Button variant="destructive" onClick={() => delId && del(delId)}><Trash2 className="w-4 h-4 mr-2" />Delete</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
