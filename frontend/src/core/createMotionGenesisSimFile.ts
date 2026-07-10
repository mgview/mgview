import { createTextFile } from '../api/localFiles.ts';
import { MGVIEW_SIM_TEMPLATE } from './mgviewSimTemplate.ts';

export async function createMotionGenesisSimFile(filePath: string): Promise<void> {
  await createTextFile(filePath, MGVIEW_SIM_TEMPLATE);
}
