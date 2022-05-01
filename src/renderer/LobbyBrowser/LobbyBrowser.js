import React, { useEffect, useState } from 'react';
import { withStyles, makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import { ipcRenderer } from 'electron';
import { IpcHandlerMessages } from '../../common/ipc-messages';
import io from 'socket.io-client';
import Store from 'electron-store';
import i18next from 'i18next';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core';
import languages from '../language/languages';
import { modList } from '../../common/Mods';
import { GameState } from '../../common/AmongUsState';
const store = new Store();
const serverUrl = store.get('serverURL', 'https://bettercrewl.ink/');
const language = store.get('language', 'en');
i18next.changeLanguage(language);
const StyledTableCell = withStyles((theme) => ({
    head: {
        backgroundColor: '#1d1a23',
        color: theme.palette.common.white,
    },
    body: {
        fontSize: 14,
    },
}))(TableCell);
const StyledTableRow = withStyles(() => ({
    root: {
        '&:nth-of-type(odd)': {
            backgroundColor: '#25232a',
        },
        '&:nth-of-type(even)': {
            backgroundColor: '#1d1a23',
        },
    },
}))(TableRow);
const useStyles = makeStyles({
    table: {
        minWidth: 700,
    },
    container: {
        maxHeight: '400px',
    },
});
const servers = {
    '50.116.1.42': 'North America',
    '172.105.251.170': 'Europe',
    '139.162.111.196': 'Asia',
    '192.241.154.115': 'skeld.net',
    '185.7.80.9': 'TOU Master',
    '78.47.142.18': 'TOR Server',
};
function sortLobbies(a, b) {
    if (a.gameState === GameState.LOBBY && b.gameState !== GameState.LOBBY) {
        return -1;
    }
    else if (b.gameState === GameState.LOBBY && a.gameState !== GameState.LOBBY) {
        return 1;
    }
    else {
        if (b.current_players === b.max_players && a.current_players !== a.max_players) {
            return -1;
        }
        if (a.current_players < b.current_players) {
            return 1;
        }
        else if (a.current_players > b.current_players) {
            return -1;
        }
        return 0;
    }
}
// @ts-ignore
export default function lobbyBrowser({ t }) {
    const classes = useStyles();
    const [publiclobbies, setPublicLobbies] = useState({});
    const [socket, setSocket] = useState();
    const [code, setCode] = React.useState('');
    const [, forceRender] = useState({});
    useEffect(() => {
        const s = io(serverUrl, {
            transports: ['websocket'],
        });
        setSocket(s);
        s.on('update_lobby', (lobby) => {
            setPublicLobbies((old) => (Object.assign(Object.assign({}, old), { [lobby.id]: lobby })));
        });
        s.on('new_lobbies', (lobbies) => {
            setPublicLobbies((old) => {
                const lobbyMap = Object.assign({}, old);
                for (const index in lobbies) {
                    lobbyMap[lobbies[index].id] = lobbies[index];
                }
                return lobbyMap;
            });
        });
        s.on('remove_lobby', (lobbyId) => {
            setPublicLobbies((old) => {
                delete old[lobbyId];
                return Object.assign({}, old);
            });
        });
        s.on('connect', () => {
            s.emit('lobbybrowser', true);
        });
        ipcRenderer.on(IpcHandlerMessages.JOIN_LOBBY_ERROR, (event, code, server) => {
            console.log('ERROR: ', code);
            setCode(`${code}  ${servers[server] ? `on region ${servers[server]}` : `\n Custom Server: ${server}`}`);
        });
        const secondPassed = setInterval(() => {
            forceRender({});
        }, 1000);
        return () => {
            socket === null || socket === void 0 ? void 0 : socket.emit('lobbybrowser', false);
            socket === null || socket === void 0 ? void 0 : socket.close();
            clearInterval(secondPassed);
        };
    }, []);
    return (React.createElement("div", { style: { height: '100%', width: '100%', paddingTop: '15px' } },
        React.createElement("div", { style: { height: '500px', padding: '20px' } },
            React.createElement("b", null, t('lobbybrowser.header')),
            React.createElement(Dialog, { open: code !== '', 
                // TransitionComponent={Transition}
                keepMounted: true, "aria-labelledby": "alert-dialog-slide-title", "aria-describedby": "alert-dialog-slide-description" },
                React.createElement(DialogTitle, { id: "alert-dialog-slide-title" }, "Lobby information"),
                React.createElement(DialogContent, null,
                    React.createElement(DialogContentText, { id: "alert-dialog-slide-description" }, code.split('\n').map((i, key) => {
                        return React.createElement("div", { key: key }, i);
                    }))),
                React.createElement(DialogActions, null,
                    React.createElement(Button, { onClick: () => setCode(''), color: "primary" }, t('buttons.close')))),
            React.createElement(Paper, null,
                React.createElement(TableContainer, { component: Paper, className: classes.container },
                    React.createElement(Table, { className: classes.table, "aria-label": "customized table", stickyHeader: true },
                        React.createElement(TableHead, null,
                            React.createElement(TableRow, null,
                                React.createElement(StyledTableCell, null, t('lobbybrowser.list.title')),
                                React.createElement(StyledTableCell, { align: "left" }, t('lobbybrowser.list.host')),
                                React.createElement(StyledTableCell, { align: "left" }, t('lobbybrowser.list.players')),
                                React.createElement(StyledTableCell, { align: "left" }, t('lobbybrowser.list.mods')),
                                React.createElement(StyledTableCell, { align: "left" }, t('lobbybrowser.list.language')),
                                React.createElement(StyledTableCell, { align: "left" }, "Status"),
                                React.createElement(StyledTableCell, { align: "left" }))),
                        React.createElement(TableBody, null, Object.values(publiclobbies)
                            .sort(sortLobbies)
                            .map((row) => {
                            var _a, _b, _c, _d;
                            return (React.createElement(StyledTableRow, { key: row.id },
                                React.createElement(StyledTableCell, { component: "th", scope: "row" }, row.title),
                                React.createElement(StyledTableCell, { align: "left" }, row.host),
                                React.createElement(StyledTableCell, { align: "left" },
                                    row.current_players,
                                    "/",
                                    row.max_players),
                                React.createElement(StyledTableCell, { align: "left" }, (_b = (_a = modList.find((o) => o.id === row.mods)) === null || _a === void 0 ? void 0 : _a.label) !== null && _b !== void 0 ? _b : 'None'),
                                React.createElement(StyledTableCell, { align: "left" }, (_d = (_c = languages[row.language]) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : 'English'),
                                React.createElement(StyledTableCell, { align: "left" },
                                    row.gameState === GameState.LOBBY ? 'Lobby' : 'In game',
                                    ' ',
                                    row.stateTime && new Date(Date.now() - row.stateTime).toISOString().substr(14, 5)),
                                React.createElement(StyledTableCell, { align: "right" },
                                    React.createElement(Button, { disabled: row.gameState !== GameState.LOBBY || row.max_players === row.current_players, variant: "contained", color: "secondary", onClick: () => {
                                            socket === null || socket === void 0 ? void 0 : socket.emit('join_lobby', row.id, (state, codeOrError, server, publicLobby) => {
                                                if (state === 0) {
                                                    setCode(`${t('lobbybrowser.code')}: ${codeOrError} \n Region: ${server}`);
                                                    // ipcRenderer.send(IpcHandlerMessages.JOIN_LOBBY, codeOrError, server);
                                                }
                                                else {
                                                    setCode(`Error: ${codeOrError}`);
                                                }
                                            });
                                        } }, "Show code"))));
                        }))))))));
}
//# sourceMappingURL=LobbyBrowser.js.map