import { Discord, Harmonica } from '../../deps.ts';

const command: Harmonica.Command<[number]> = {
    name: 'test',
    description: 'A test',
    arguments: [{
        name: 'testarg',
        description: 'A test argument',
        type: 'number',
        oneOf: [1, 2, 4]
    }],
    run: (wrapper: Harmonica.BotWrapper, data: Harmonica.CommandData, testarg: number) => {
        data.channel.send(`It is ${testarg}!`);
    }
};

export default command;
