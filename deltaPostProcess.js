import { isPublishedService, updateStatusPublicService, STATUS_TO_REPUBLISH_URI } from './queries';

export async function processDelta(concepts){
  const admsStatus = "http://www.w3.org/ns/adms#status";
  const concept_uri = "http://lblod.data.gift/concepts/79a52da4-f491-4e2f-9374-89a13cde8ecd";

  //get insertions with type PublicService
  const servicesInsertions = concepts.flatMap( x => x.inserts )
      .filter(x=> x.predicate.value == admsStatus && x.object.value == concept_uri);
  for (let publicService of servicesInsertions) {
    // check if status concept has been published
    const isPublished = await isPublishedService( publicService );
    if (isPublished){
      updateStatusPublicService(publicService, STATUS_TO_REPUBLISH_URI);
    }
  }
}
