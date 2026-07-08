import type { AskHandler } from './ask-handler';
import { createProgram } from './create-program';

const handler: AskHandler = async (question) => question;

createProgram(handler).parse(process.argv);
