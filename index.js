#! /usr/bin/env node

const {createReadStream} = require('tail-stream');
const chalk = require('chalk');
const through = require('through2');
const logFile = './storage/logs/laravel.log';
const cwd = process.cwd();

const formatters = [
    [/^\[(.*?)\s(.*?)\]\s(.*?)\.(.*?):\s(.*)/, (line, date, time, mode, type, message) => {
        const typeColor = /error|exception/i.test(message) ? chalk.red : chalk.green;
        const json = tryParseJSON(message);
        return `${chalk.dim(`[${date} ${time}]`)} ${typeColor(type)}: ${json ? JSON.stringify(json, null, 2) : message}`;
    }],
    [/^#(\d+)\s(.*)/, (line, lineNum, trace) =>
        `  ${chalk.cyan(lineNum)} ${trace.replace(cwd, '.')}`
    ],
    [/^stack trace:/i, chalk.cyan]
];

function tryParseJSON(string) {
    try {
        return JSON.parse(string);
    } catch(error) {
        return false;
    }
}

function formatLine(line) {
    if(!line) return line;
    for(let [regex, format] of formatters) {
        const match = line.match(regex);
        if(match) {
            return format(line, ...match.slice(1));
        }
    }
    return line;
}

createReadStream(logFile)
    .pipe(through(function(chunk, enc, callback) {
        this.push(chunk.toString().split('\n').map(formatLine).join('\n'));
        callback();
    }))
    .pipe(process.stdout);

setInterval(() => {}, Number.POSITIVE_INFINITY); // keep process alive
