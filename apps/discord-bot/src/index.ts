import { Client } from 'discord.js';

import { fetchDiscordMembers } from './workers/fetchDiscordMembers';
import { schedule } from './utils';
import { config, safePrintConfig } from './config';
import { initDiscordClient } from './bot';
import { Firebase, initFirebase } from './model/firebase';
import { fetchStarknetIds } from './workers/fetchStartknetIds';
import { applyRules } from './workers/applyRules';
import { logger } from './logger';

export interface AppContext {
  discordClient: Client;
  firebase: Firebase;
}

var _appContext: AppContext;
export function useAppContext() {
  if (!_appContext) {
    throw new Error('App context not initialized');
  }
  return _appContext;
}

const runApp = async () => {
  safePrintConfig();

  const discordClient = await initDiscordClient(config);
  logger.info('Discord client initialized');

  const firebase = initFirebase(config);
  logger.info('Firebase client initialized');

  _appContext = { discordClient, firebase };

  await Promise.all([
    schedule(fetchDiscordMembers, 10),
    schedule(fetchStarknetIds, 10),
    schedule(applyRules, 10),
  ]);
};

runApp();
