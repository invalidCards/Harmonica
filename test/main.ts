import { default as config } from './config.ts';
import { path } from './deps.ts';
import { BotWrapper } from '../mod.ts';

const wrapper = new BotWrapper({
    token: config.token,
    owners: config.owners,
    commandPath: path.join(Deno.cwd(), 'commands'),
    useSlashes: config.useSlashes,
    prefix: config.prefix
});

wrapper.register([
    ['test', 'Testing commands']
]).then(() => {
    wrapper.run();
});
