import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {writeReleaseManifest,releaseMatches} from '../scripts/release-manifest.mjs'

const commit='a'.repeat(40)
const index=Buffer.from('<!doctype html><title>SlideHub QA</title>')
function withDist(fn){
 const dir=mkdtempSync(join(tmpdir(),'slidehub-release-'))
 try{fn(dir)}finally{rmSync(dir,{recursive:true,force:true})}
}
test('release manifest identifies actual built HTML and commit',()=>withDist(dir=>{
 writeFileSync(join(dir,'index.html'),index)
 const result=writeReleaseManifest(dir,commit)
 assert.deepEqual(JSON.parse(readFileSync(join(dir,'release.json'),'utf8')),result)
 assert.equal(releaseMatches(result,commit,index),true)
 assert.equal(releaseMatches(result,'b'.repeat(40),index),false)
 assert.equal(releaseMatches(result,commit,Buffer.from('old index')),false)
 assert.equal(releaseMatches(null,commit,index),false)
 assert.equal(releaseMatches({...result,schemaVersion:2},commit,index),false)
}))
test('release manifest rejects invalid revision and missing/empty build',()=>withDist(dir=>{
 assert.throws(()=>writeReleaseManifest(dir,'main'),/commit SHA/)
 assert.throws(()=>writeReleaseManifest(dir,commit))
 writeFileSync(join(dir,'index.html'),'')
 assert.throws(()=>writeReleaseManifest(dir,commit),/Missing built index/)
 assert.equal(existsSync(join(dir,'release.json')),false)
}))
