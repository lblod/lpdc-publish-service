import { isPublishedService, updateStatusPublicService, STATUS_TO_REPUBLISH_URI } from './queries';

export async function processDelta(concepts){
  // Extracts the subjects of interest. We only expect inserts to be interesting (status or tombstone gets inserted).
  // Deltanotfier rules will make sure we're close to getting what we want.
  let deltasBindings = concepts.flatMap( x => x.inserts ).map(x => x.subject.value);
  deltasBindings = [ ...new Set(deltasBindings) ]; //make them unique
  for (let publicService of deltasBindings) {
    // check if status concept has been published
    const isPublished = await isPublishedService( publicService );
    if (isPublished){
      await updateStatusPublicService(publicService, STATUS_TO_REPUBLISH_URI);
    }
  }
}
