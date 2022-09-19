export async function processDelta(deltabody){
  //get insertions
  const insertions = body.map( x => x.inserts );
  for (let concept of insertions) {
    // check if status concept has been published
    // if yes remove it
  }
}
