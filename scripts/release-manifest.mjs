import {createHash} from 'node:crypto'
import {readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'

const validCommit=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value)
const digest=bytes=>createHash('sha256').update(bytes).digest('hex')

export function writeReleaseManifest(dist,commit){
 if(!validCommit(commit))throw Error('Expected a full Git commit SHA')
 const index=readFileSync(resolve(dist,'index.html'))
 if(index.length===0)throw Error('Missing built index content')
 const manifest={schemaVersion:1,commit,indexSha256:digest(index)}
 writeFileSync(resolve(dist,'release.json'),JSON.stringify(manifest)+'\n')
 return manifest
}

export function releaseMatches(manifest,expectedCommit,index){
 return validCommit(expectedCommit)&&manifest?.schemaVersion===1&&
  manifest.commit===expectedCommit&&manifest.indexSha256===digest(index)
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const result=writeReleaseManifest(resolve('dist'),process.env.GITHUB_SHA)
 console.log('Release manifest stamped for '+result.commit)
}
