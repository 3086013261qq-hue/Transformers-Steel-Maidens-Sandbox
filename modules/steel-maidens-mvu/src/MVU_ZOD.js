// Fullstack registerMvuSchema entry, Zod 4 loose object = passthrough semantics.
// z is supplied by Tavern Helper. No faction or music slots.
import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';
export const Schema = z.object({}).loose().prefault({});
$(() => { registerMvuSchema(Schema); });
