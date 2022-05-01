import React, { useState, useEffect } from 'react';
import makeStyles from '@material-ui/core/styles/makeStyles';
import { DialogContent, DialogTitle, DialogActions, Dialog, Button, TextField, IconButton } from '@material-ui/core';
import languages from '../language/languages';
import Alert from '@material-ui/lab/Alert';
import ChevronLeft from '@material-ui/icons/ArrowBack';
const useStyles = makeStyles((theme) => ({
    specialButton: {
        width: '90%',
        marginBottom: '10px',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
    },
    back: {
        cursor: 'pointer',
        position: 'absolute',
        right: theme.spacing(1),
        WebkitAppRegion: 'no-drag',
    },
}));
const RawPublicLobbySettings = function ({ t, lobbySettings, updateSetting, canChange, className, }) {
    const [open, setOpen] = useState(false);
    const classes = useStyles();
    useEffect(() => {
        setLobbySettingState(lobbySettings);
    }, [lobbySettings]);
    const [lobbySettingState, setLobbySettingState] = useState(lobbySettings);
    return (React.createElement(React.Fragment, null,
        React.createElement(Button, { variant: "contained", color: "secondary", className: classes.specialButton, onClick: () => setOpen(true), disabled: !canChange }, t('settings.lobbysettings.public_lobby.change_settings')),
        React.createElement(Dialog, { fullScreen: true, open: open, onClose: () => setOpen(false) },
            React.createElement("div", { className: classes.header },
                React.createElement(DialogTitle, null, t('settings.lobbysettings.public_lobby.change_settings')),
                React.createElement(IconButton, { className: classes.back, size: "small", onClick: () => {
                        setOpen(false);
                    } },
                    React.createElement(ChevronLeft, { htmlColor: "#777" }))),
            React.createElement(DialogContent, { className: className },
                React.createElement(TextField, { fullWidth: true, spellCheck: false, label: t('settings.lobbysettings.public_lobby.title'), value: lobbySettingState.publicLobby_title, onChange: (ev) => setLobbySettingState(Object.assign(Object.assign({}, lobbySettingState), { publicLobby_title: ev.target.value })), onBlur: (ev) => updateSetting('publicLobby_title', ev.target.value), variant: "outlined", color: "primary", disabled: !canChange }),
                React.createElement(TextField, { fullWidth: true, select: true, label: t('settings.lobbysettings.public_lobby.language'), variant: "outlined", color: "secondary", SelectProps: { native: true }, InputLabelProps: { shrink: true }, value: lobbySettingState.publicLobby_language, onChange: (ev) => setLobbySettingState(Object.assign(Object.assign({}, lobbySettingState), { publicLobby_language: ev.target.value })), onBlur: (ev) => updateSetting('publicLobby_language', ev.target.value), disabled: !canChange }, Object.entries(languages).map(([key, value]) => (React.createElement("option", { key: key, value: key }, value.name)))),
                React.createElement(Alert, { severity: "error" }, t('settings.lobbysettings.public_lobby.ban_warning'))),
            React.createElement(DialogActions, null,
                React.createElement(Button, { color: "primary", onClick: () => {
                        setOpen(false);
                    } }, t('buttons.confirm'))))));
};
const PublicLobbySettings = React.memo(RawPublicLobbySettings);
export default PublicLobbySettings;
//# sourceMappingURL=PublicLobbySettings.js.map