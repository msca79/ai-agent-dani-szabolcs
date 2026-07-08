import { resolve } from 'node:path';
import { askAgent } from '@boardgame/core';
import { config } from 'dotenv';
import { createProgram } from './create-program';

config({ path: resolve(__dirname, '../../../.env') });

createProgram(askAgent).parse(process.argv);
