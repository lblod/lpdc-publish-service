import { isPublishedService, removePublishedStatus } from './queries';

export async function processDelta(deltabody){
  const admsStatus = "http://www.w3.org/ns/adms#status";
  const sent_uri = "http://lblod.data.gift/concepts/9bd8d86d-bb10-4456-a84e-91e9507c374c";

  //get insertions with type PublicService
  const insertions = deltabody.flatMap( x => x.inserts )
      .filter(x=> x.predicate.value == admsStatus && x.object.value == sent_uri);
  for (let concept of insertions) {
    // check if status concept has been published
    const isPublished = await isPublishedService( concept );
    if (isPublished){
      removePublishedStatus( concept );
    }
  }
}
