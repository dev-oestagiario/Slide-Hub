import test from 'node:test'
import assert from 'node:assert/strict'
import {parseSlides} from '../src/lib/slideParser.ts'
import {
  emptyLayout,reconcileEditorLayout,editorSlides,splitVisibleBlocks,setBlockRect,
  resetBlockRect,normalizeEditorLayout,slideCollisions,layoutsEqual
} from '../src/features/editor/layoutModel.ts'

let counter=0
const id=()=>String(++counter).padStart(8,'0')
test('F4: same block keeps its id and position after editing its text',()=>{
  const base=parseSlides('# Aula\n\nPrimeira explicação\n\n## Conceito\n\nOutra explicação')
  let layout=reconcileEditorLayout(base,emptyLayout(),id)
  const p=layout.blocks.find(b=>b.markdown==='Outra explicação')
  assert.ok(p)
  layout=setBlockRect(layout,p.id,{x:.55,y:.37,w:.33,h:.25,z:3})
  const updated=parseSlides('# Aula\n\nPrimeira explicação\n\n## Conceito\n\nOutra explicação com mais conteúdo')
  const next=reconcileEditorLayout(updated,layout,id)
  const edited=next.blocks.find(b=>b.markdown.includes('mais conteúdo'))
  assert.equal(edited?.id,p.id)
  assert.deepEqual(next.overrides[p.id],{x:.55,y:.37,w:.33,h:.25,z:3})
})
test('F4: inserting a new slide before another does not change old block id or geometry',()=>{
  const first=parseSlides('# Aula\n\nDescrição\n\n## Seção A\n\nUm texto')
  let layout=reconcileEditorLayout(first,emptyLayout(),id)
  const last=layout.blocks.find(x=>x.markdown==='Um texto')
  assert.ok(last)
  layout=setBlockRect(layout,last.id,{x:.4,y:.3,w:.45,h:.3,z:1})
  const second=parseSlides('# Aula\n\nDescrição\n\n## Seção nova\n\nTexto adicionado\n\n## Seção A\n\nUm texto')
  const next=reconcileEditorLayout(second,layout,id)
  const relocated=next.blocks.find(x=>x.markdown==='Um texto')
  assert.equal(relocated?.id,last.id)
  assert.deepEqual(next.overrides[last.id],layout.overrides[last.id])
  assert.notEqual(editorSlides(first,layout)[1].key,editorSlides(second,next)[1].key)
  assert.equal(editorSlides(first,layout)[1].key,editorSlides(second,next)[2].key)
})
test('F4: block parser does not split fenced code with empty lines or headings',()=>{
  const blocks=splitVisibleBlocks('# Aula\n\n```md\n## Não separar\n\n- manter\n```\n\nTexto')
  assert.equal(blocks.length,3)
  assert.equal(blocks[1].kind,'code')
  assert.match(blocks[1].markdown,/## Não separar/)
})
test('F4: position validation rejects invalid values and clamps out of bounds',()=>{
  let layout=reconcileEditorLayout(parseSlides('# Aula\n\nTexto'),emptyLayout(),id)
  const block=layout.blocks[0]
  const invalid=setBlockRect(layout,block.id,{x:NaN,y:0,w:.5,h:.2,z:0})
  assert.deepEqual(invalid,layout)
  layout=setBlockRect(layout,block.id,{x:.95,y:.93,w:.4,h:.2,z:999})
  assert.deepEqual(layout.overrides[block.id],{x:.6,y:.8,w:.4,h:.2,z:100})
  layout=resetBlockRect(layout,block.id)
  assert.equal(layout.overrides[block.id],undefined)
})
test('F4: deleted blocks clean up old positions and new blocks remain automatic',()=>{
  const first=reconcileEditorLayout(parseSlides('# Aula\n\nManter\n\nExcluir'),emptyLayout(),id)
  const disappearing=first.blocks.find(b=>b.markdown==='Excluir')
  assert.ok(disappearing)
  const positioned=setBlockRect(first,disappearing.id,{x:.2,y:.2,w:.3,h:.3,z:1})
  const next=reconcileEditorLayout(parseSlides('# Aula\n\nManter'),positioned,id)
  assert.equal(next.blocks.length,2)
  assert.equal(next.overrides[disappearing.id],undefined)
})
test('F4: collisions can be detected without moving pinned blocks',()=>{
  const base=reconcileEditorLayout(parseSlides('# Aula\n\nA\n\nB'),emptyLayout(),id)
  const blocks=base.blocks
  const a=setBlockRect(base,blocks[1].id,{x:.2,y:.2,w:.5,h:.4,z:2})
  const b=setBlockRect(a,blocks[2].id,{x:.3,y:.3,w:.5,h:.4,z:3})
  assert.equal(slideCollisions(editorSlides(parseSlides('# Aula\n\nA\n\nB'),b)[0],b),1)
  assert.equal(slideCollisions(editorSlides(parseSlides('# Aula\n\nA\n\nB'),a)[0],a),0)
})
test('F4: malformed stored layout and IDs cannot inject geometry',()=>{
  const layout=normalizeEditorLayout({blocks:[{id:'bad',markdown:'a',slideIndex:0}],overrides:{bad:{x:1,y:1,w:1,h:1,z:0}}})
  assert.deepEqual(layout,emptyLayout())
})

test('F4: JSONB can reorder override keys without triggering endless autosave',()=>{
  const first=reconcileEditorLayout(parseSlides('# Aula\n\nA\n\nB'),emptyLayout(),id)
  const a=setBlockRect(first,first.blocks[1].id,{x:.1,y:.1,w:.3,h:.2,z:1})
  const b=setBlockRect(a,first.blocks[2].id,{x:.5,y:.5,w:.3,h:.2,z:2})
  const reordered={...b,overrides:Object.fromEntries(Object.entries(b.overrides).reverse())}
  assert.equal(layoutsEqual(b,reordered),true)
  assert.equal(layoutsEqual(b,a),false)
})
test('F4: new paragraph does not take a pinned position from different text',()=>{
  const old=reconcileEditorLayout(parseSlides('# Aula\n\nA explicação original extensa'),emptyLayout(),id)
  const pinned=old.blocks.find(block=>block.kind==='paragraph')
  assert.ok(pinned)
  const positioned=setBlockRect(old,pinned.id,{x:.5,y:.3,w:.4,h:.25,z:2})
  const changed=reconcileEditorLayout(parseSlides('# Aula\n\nTexto completamente novo sem relação\n\nA explicação original extensa'),positioned,id)
  const original=changed.blocks.find(block=>block.markdown==='A explicação original extensa')
  const inserted=changed.blocks.find(block=>block.markdown==='Texto completamente novo sem relação')
  assert.equal(original?.id,pinned.id)
  assert.notEqual(inserted?.id,pinned.id)
  assert.equal(changed.overrides[inserted.id],undefined)
})
test('F4: heading rename preserves position when it is the only unmatched heading',()=>{
  const old=reconcileEditorLayout(parseSlides('# Título original\n\nDescrição'),emptyLayout(),id)
  const heading=old.blocks.find(block=>block.kind==='heading')
  assert.ok(heading)
  const positioned=setBlockRect(old,heading.id,{x:.2,y:.1,w:.5,h:.2,z:1})
  const updated=reconcileEditorLayout(parseSlides('# Título reformulado\n\nDescrição'),positioned,id)
  assert.equal(updated.blocks.find(block=>block.kind==='heading')?.id,heading.id)
})
