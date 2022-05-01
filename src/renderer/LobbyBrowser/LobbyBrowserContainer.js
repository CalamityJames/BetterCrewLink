import React from 'react';
import ReactDOM from 'react-dom';
import { ThemeProvider } from '@material-ui/core/styles';
import RefreshSharpIcon from '@material-ui/icons/RefreshSharp';
import CloseIcon from '@material-ui/icons/Close';
import MinimizeIcon from '@material-ui/icons/Minimize';
import IconButton from '@material-ui/core/IconButton';
import makeStyles from '@material-ui/core/styles/makeStyles';
import '../css/index.css';
import 'source-code-pro/source-code-pro.css';
import 'typeface-varela/index.css';
import '../language/i18n';
import theme from '../theme';
import LobbyBrowser from './LobbyBrowser';
import { withNamespaces } from 'react-i18next';
import { ipcRenderer } from 'electron';
const useStyles = makeStyles(() => ({
    root: {
        position: 'absolute',
        width: '100vw',
        height: theme.spacing(3),
        backgroundColor: '#1d1a23',
        top: 0,
        WebkitAppRegion: 'drag',
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
    minimalizeIcon: {
        '& svg': {
            paddingBottom: '7px',
            marginTop: '-8px',
        },
    },
}));
const TitleBar = function () {
    const classes = useStyles();
    return (React.createElement("div", { className: classes.root },
        React.createElement("span", { className: classes.title, style: { marginLeft: 10 } }, "LobbyBrowser"),
        React.createElement(IconButton, { className: classes.button, size: "small", onClick: () => ipcRenderer.send('reload', true) },
            React.createElement(RefreshSharpIcon, { htmlColor: "#777" })),
        React.createElement(IconButton, { className: [classes.button, classes.minimalizeIcon].join(' '), style: { right: 20 }, size: "small", onClick: () => ipcRenderer.send('minimize', true) },
            React.createElement(MinimizeIcon, { htmlColor: "#777", y: "100" })),
        React.createElement(IconButton, { className: classes.button, style: { right: 0 }, size: "small", onClick: () => {
                window.close();
            } },
            React.createElement(CloseIcon, { htmlColor: "#777" }))));
};
// @ts-ignore
export default function App({ t }) {
    return (React.createElement(ThemeProvider, { theme: theme },
        React.createElement(TitleBar, null),
        React.createElement(LobbyBrowser, { t: t })));
}
// @ts-ignore
const App2 = withNamespaces()(App);
// @ts-ignore
ReactDOM.render(React.createElement(App2, null), document.getElementById('app'));
//# sourceMappingURL=LobbyBrowserContainer.js.map