import React, { useEffect, useReducer, useState, useRef } from 'react';
import Voice from './Voice';
import Menu from './Menu';
import { ipcRenderer } from 'electron';
import Settings, { settingsReducer, lobbySettingsReducer, pushToTalkOptions } from './settings/Settings';
import { GameStateContext, SettingsContext, LobbySettingsContext, PlayerColorContext } from './contexts';
import { ThemeProvider } from '@material-ui/core/styles';
import { IpcHandlerMessages, IpcMessages, IpcRendererMessages, IpcSyncMessages, } from '../common/ipc-messages';
import theme from './theme';
import SettingsIcon from '@material-ui/icons/Settings';
import RefreshSharpIcon from '@material-ui/icons/RefreshSharp';
import CloseIcon from '@material-ui/icons/Close';
import IconButton from '@material-ui/core/IconButton';
import Dialog from '@material-ui/core/Dialog';
import makeStyles from '@material-ui/core/styles/makeStyles';
import LinearProgress from '@material-ui/core/LinearProgress';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import prettyBytes from 'pretty-bytes';
import { IpcOverlayMessages } from '../common/ipc-messages';
import ReactDOM from 'react-dom';
import './css/index.css';
import 'source-code-pro/source-code-pro.css';
import 'typeface-varela/index.css';
import { DEFAULT_PLAYERCOLORS } from '../main/avatarGenerator';
import './language/i18n';
import { withNamespaces } from 'react-i18next';
import { GamePlatform } from '../common/GamePlatform';
let appVersion = '';
if (typeof window !== 'undefined' && window.location) {
    const query = new URLSearchParams(window.location.search.substring(1));
    appVersion = ' v' + query.get('version') || '';
}
const useStyles = makeStyles(() => ({
    root: {
        position: 'absolute',
        width: '100vw',
        height: theme.spacing(3),
        backgroundColor: '#1d1a23',
        top: 0,
        WebkitAppRegion: 'drag',
        zIndex: 100,
    },
    title: {
        width: '100%',
        textAlign: 'center',
        display: 'block',
        height: theme.spacing(3),
        lineHeight: `${theme.spacing(3)}px`,
        color: theme.palette.primary.main,
    },
    button: {
        WebkitAppRegion: 'no-drag',
        marginLeft: 'auto',
        padding: 0,
        position: 'absolute',
        top: 0,
    },
}));
const RawTitleBar = function ({ settingsOpen, setSettingsOpen }) {
    const classes = useStyles();
    return (React.createElement("div", { className: classes.root },
        React.createElement("span", { className: classes.title, style: { marginLeft: 10 } },
            "CJ CrewLink ",
            appVersion),
        React.createElement(IconButton, { className: classes.button, style: { left: 0 }, size: "small", onClick: () => setSettingsOpen(!settingsOpen) },
            React.createElement(SettingsIcon, { htmlColor: "#777" })),
        React.createElement(IconButton, { className: classes.button, style: { left: 22 }, size: "small", onClick: () => ipcRenderer.send('reload') },
            React.createElement(RefreshSharpIcon, { htmlColor: "#777" })),
        React.createElement(IconButton, { className: classes.button, style: { right: 0 }, size: "small", onClick: () => ipcRenderer.send(IpcMessages.QUIT_CREWLINK) },
            React.createElement(CloseIcon, { htmlColor: "#777" }))));
};
const TitleBar = React.memo(RawTitleBar);
var AppState;
(function (AppState) {
    AppState[AppState["MENU"] = 0] = "MENU";
    AppState[AppState["VOICE"] = 1] = "VOICE";
})(AppState || (AppState = {}));
// @ts-ignore
export default function App({ t }) {
    const [state, setState] = useState(AppState.MENU);
    const [gameState, setGameState] = useState({});
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [diaOpen, setDiaOpen] = useState(true);
    const [error, setError] = useState('');
    const [updaterState, setUpdaterState] = useState({
        state: 'unavailable',
    });
    const playerColors = useRef(DEFAULT_PLAYERCOLORS);
    const overlayInitCount = useRef(0);
    const settings = useReducer(settingsReducer, {
        language: 'default',
        alwaysOnTop: true,
        microphone: 'Default',
        speaker: 'Default',
        pushToTalkMode: pushToTalkOptions.VOICE,
        serverURL: 'https://bettercrewl.ink/',
        pushToTalkShortcut: 'V',
        deafenShortcut: 'RControl',
        muteShortcut: 'RAlt',
        impostorRadioShortcut: 'F',
        hideCode: false,
        natFix: false,
        mobileHost: true,
        overlayPosition: 'right',
        compactOverlay: false,
        enableOverlay: false,
        meetingOverlay: false,
        ghostVolume: 100,
        masterVolume: 100,
        microphoneGain: 100,
        micSensitivity: 0.15,
        microphoneGainEnabled: false,
        micSensitivityEnabled: false,
        vadEnabled: true,
        hardware_acceleration: true,
        echoCancellation: true,
        enableSpatialAudio: true,
        obsSecret: undefined,
        obsOverlay: false,
        noiseSuppression: true,
        playerConfigMap: {},
        localLobbySettings: {
            maxDistance: 5.32,
            haunting: false,
            hearImpostorsInVents: false,
            impostersHearImpostersInvent: false,
            impostorRadioEnabled: false,
            commsSabotage: false,
            deadOnly: false,
            meetingGhostOnly: false,
            hearThroughCameras: false,
            wallsBlockAudio: false,
            visionHearing: false,
            publicLobby_on: false,
            publicLobby_title: '',
            publicLobby_language: 'en',
        },
        launchPlatform: GamePlatform.STEAM,
        customPlatforms: {},
        useRHSJokes: true
    });
    const lobbySettings = useReducer(lobbySettingsReducer, settings[0].localLobbySettings);
    useEffect(() => {
        ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_PLAYERCOLORS_CHANGED, playerColors.current);
        ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_SETTINGS_CHANGED, settings[0]);
        ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_GAME_STATE_CHANGED, gameState);
    }, [overlayInitCount.current]);
    useEffect(() => {
        const onOpen = (_, isOpen) => {
            setState(isOpen ? AppState.VOICE : AppState.MENU);
        };
        const onState = (_, newState) => {
            setGameState(newState);
        };
        const onError = (_, error) => {
            shouldInit = false;
            setError(error);
        };
        const onAutoUpdaterStateChange = (_, state) => {
            setUpdaterState((old) => (Object.assign(Object.assign({}, old), state)));
        };
        const onColorsChange = (_, colors) => {
            console.log('RECIEVED COLORS');
            playerColors.current = colors;
            ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_PLAYERCOLORS_CHANGED, colors);
        };
        const onOverlayInit = () => {
            overlayInitCount.current++;
        };
        let shouldInit = true;
        ipcRenderer
            .invoke(IpcHandlerMessages.START_HOOK)
            .then(() => {
            if (shouldInit) {
                setGameState(ipcRenderer.sendSync(IpcSyncMessages.GET_INITIAL_STATE));
            }
        })
            .catch((error) => {
            if (shouldInit) {
                shouldInit = false;
                setError(error.message);
            }
        });
        ipcRenderer.on(IpcRendererMessages.AUTO_UPDATER_STATE, onAutoUpdaterStateChange);
        ipcRenderer.on(IpcRendererMessages.NOTIFY_GAME_OPENED, onOpen);
        ipcRenderer.on(IpcRendererMessages.NOTIFY_GAME_STATE_CHANGED, onState);
        ipcRenderer.on(IpcRendererMessages.ERROR, onError);
        ipcRenderer.on(IpcOverlayMessages.NOTIFY_PLAYERCOLORS_CHANGED, onColorsChange);
        ipcRenderer.on(IpcOverlayMessages.REQUEST_INITVALUES, onOverlayInit);
        return () => {
            ipcRenderer.off(IpcRendererMessages.AUTO_UPDATER_STATE, onAutoUpdaterStateChange);
            ipcRenderer.off(IpcRendererMessages.NOTIFY_GAME_OPENED, onOpen);
            ipcRenderer.off(IpcRendererMessages.NOTIFY_GAME_STATE_CHANGED, onState);
            ipcRenderer.off(IpcRendererMessages.ERROR, onError);
            ipcRenderer.off(IpcOverlayMessages.NOTIFY_PLAYERCOLORS_CHANGED, onColorsChange);
            shouldInit = false;
        };
    }, []);
    useEffect(() => {
        ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_GAME_STATE_CHANGED, gameState);
    }, [gameState]);
    useEffect(() => {
        console.log(playerColors.current);
        ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_PLAYERCOLORS_CHANGED, playerColors.current);
        ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_SETTINGS_CHANGED, settings[0]);
    }, [settings[0]]);
    let page;
    switch (state) {
        case AppState.MENU:
            page = React.createElement(Menu, { t: t, error: error });
            break;
        case AppState.VOICE:
            page = React.createElement(Voice, { t: t, error: error });
            break;
    }
    return (React.createElement(PlayerColorContext.Provider, { value: playerColors.current },
        React.createElement(GameStateContext.Provider, { value: gameState },
            React.createElement(LobbySettingsContext.Provider, { value: lobbySettings },
                React.createElement(SettingsContext.Provider, { value: settings },
                    React.createElement(ThemeProvider, { theme: theme },
                        React.createElement(TitleBar, { settingsOpen: settingsOpen, setSettingsOpen: setSettingsOpen }),
                        React.createElement(Settings, { t: t, open: settingsOpen, onClose: () => setSettingsOpen(false) }),
                        React.createElement(Dialog, { fullWidth: true, open: updaterState.state !== 'unavailable' && diaOpen },
                            updaterState.state === 'downloaded' && updaterState.info && (React.createElement(DialogTitle, null,
                                "Update v",
                                updaterState.info.version)),
                            updaterState.state === 'downloading' && React.createElement(DialogTitle, null, "Updating..."),
                            React.createElement(DialogContent, null,
                                updaterState.state === 'downloading' && updaterState.progress && (React.createElement(React.Fragment, null,
                                    React.createElement(LinearProgress, { variant: 'determinate', value: updaterState.progress.percent }),
                                    React.createElement(DialogContentText, null,
                                        prettyBytes(updaterState.progress.transferred),
                                        " / ",
                                        prettyBytes(updaterState.progress.total)))),
                                updaterState.state === 'downloaded' && (React.createElement(React.Fragment, null,
                                    React.createElement(LinearProgress, { variant: 'indeterminate' }),
                                    React.createElement(DialogContentText, null, "Restart now or later?"))),
                                updaterState.state === 'error' && (React.createElement(DialogContentText, { color: "error" }, updaterState.error))),
                            updaterState.state === 'error' && (React.createElement(DialogActions, null,
                                React.createElement(Button, { href: "https://github.com/OhMyGuus/BetterCrewLink/releases/latest" }, "Download Manually"))),
                            updaterState.state === 'downloaded' && (React.createElement(DialogActions, null,
                                React.createElement(Button, { onClick: () => {
                                        ipcRenderer.send('update-app');
                                    } }, "Now"),
                                React.createElement(Button, { onClick: () => {
                                        setDiaOpen(false);
                                    } }, "Later")))),
                        page))))));
}
// @ts-ignore
const App2 = withNamespaces()(App);
// @ts-ignore
ReactDOM.render(React.createElement(App2, null), document.getElementById('app'));
//# sourceMappingURL=App.js.map