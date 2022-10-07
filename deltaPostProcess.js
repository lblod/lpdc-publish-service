import { isPublishedService, removePublishedStatus } from './queries';

export async function processDelta(deltabody){
  const rdfType = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
  const cpsvPublicService = "http://purl.org/vocab/cpsv#PublicService";
  //get insertions
  const insertions = deltabody.flatMap( x => x.inserts )
      .filter(x=> x.predicate.value == rdfType && x.object.value == cpsvPublicService);
  for (let concept of insertions) {
    // check if status concept has been published
    const isPublished = await isPublishedService( concept );
    if (isPublished){
      removePublishedStatus( concept );
    }
  }
}
