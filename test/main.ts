import { default as config } from './config.ts';
import { path } from './deps.ts';
import { BotWrapper } from '../mod.ts';

const wrapper = new BotWrapper({
    token: config.token,
    owners: config.owners,
    commandPath: path.join(path.dirname(path.fromFileUrl(import.meta.url)), 'commands'),
    eventPath: path.join(path.dirname(path.fromFileUrl(import.meta.url)), 'events'),
    useSlashes: config.useSlashes,
    prefix: config.prefix,
    supportLink: config.supportLink,
    supportTitle: 'invalidCards\' support server',
    themeColor: '#8c1126',
    useTestGuild: config.useTestGuild,
    testGuildId: config.testGuildId
});

wrapper.register([
    ['test', 'Testing commands']
]).then(() => {
    wrapper.run();
});
