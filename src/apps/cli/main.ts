import { resolve } from 'node:path';
import { queryAgent } from '../../agents/query-agent/query-agent';
import { config } from 'dotenv';
import { createProgram } from './create-program';

config({ path: resolve(__dirname, '../../../.env') });

createProgram(queryAgent).parse(process.argv);
