import { GenerationProgress } from './state';
import { SchedulerInput, SchedulerResult } from './scheduler';

export type WorkerInMessage = 
  | { type: 'START_SCHEDULING'; payload: SchedulerInput }
  | { type: 'CANCEL_SCHEDULING' };

export type WorkerOutMessage =
  | { type: 'PROGRESS_UPDATE'; payload: GenerationProgress }
  | { type: 'SCHEDULING_COMPLETE'; payload: SchedulerResult }
  | { type: 'SCHEDULING_ERROR'; payload: { error: string } };
