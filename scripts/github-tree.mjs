// Git tree creation is content addressed and does not publish a branch. A
// timed-out large tree can safely be split into smaller trees before commit.
export async function createTreeBatch(repo, entries, baseTree, request) {
  try {
    return (await request(`repos/${repo}/git/trees`,'POST',{
      ...(baseTree?{base_tree:baseTree}:{}),tree:entries,
    })).sha;
  } catch(error) {
    if (!/HTTP 422/.test(error.message) || !/timed out|too large/i.test(error.message)) throw error;
    if(entries.length>1) {
      const middle=Math.ceil(entries.length/2);
      const left=await createTreeBatch(repo,entries.slice(0,middle),baseTree,request);
      return createTreeBatch(repo,entries.slice(middle),left,request);
    }
    const entry=entries[0];
    if(!entry || typeof entry.content!=='string') throw error;
    const blob=await request(`repos/${repo}/git/blobs`,'POST',{
      encoding:'base64',content:Buffer.from(entry.content,'utf8').toString('base64'),
    });
    const {content,...metadata}=entry;
    return createTreeBatch(repo,[{...metadata,sha:blob.sha}],baseTree,request);
  }
}
