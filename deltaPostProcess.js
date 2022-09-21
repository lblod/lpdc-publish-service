import { isPublishedService, removePublishedStatus } from './queries';

export async function processDelta(deltabody){
  //get insertions
  const insertions = deltabody.flatMap( x => x.inserts );
  for (let concept of insertions) {
    // check if status concept has been published
    const isPublished = isPublishedService( concept );
    if (isPublished){
      removePublishedStatus( concept );
    }
  }
}
