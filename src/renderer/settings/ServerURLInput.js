import React, { useEffect, useState } from 'react';
import Alert from '@material-ui/lab/Alert';
import { DialogContent, DialogTitle, DialogActions, Dialog, Button, TextField } from '@material-ui/core';
import { isHttpUri, isHttpsUri } from 'valid-url';
function validateServerUrl(uri) {
    try {
        if (!isHttpUri(uri) && !isHttpsUri(uri))
            return false;
        const url = new URL(uri);
        if (url.hostname === 'discord.gg')
            return false;
        if (url.pathname !== '/')
            return false;
        return true;
    }
    catch (_) {
        return false;
    }
}
const RawServerURLInput = function ({ t, initialURL, onValidURL, className }) {
    const [isValidURL, setURLValid] = useState(true);
    const [currentURL, setCurrentURL] = useState(initialURL);
    const [open, setOpen] = useState(false);
    useEffect(() => {
        setCurrentURL(initialURL);
    }, [initialURL]);
    function handleChange(event) {
        const url = event.target.value.trim();
        setCurrentURL(url);
        if (validateServerUrl(url)) {
            setURLValid(true);
        }
        else {
            setURLValid(false);
        }
    }
    return (React.createElement(React.Fragment, null,
        React.createElement(Button, { variant: "contained", color: "secondary", onClick: () => setOpen(true) }, t('settings.advanced.change_server')),
        React.createElement(Dialog, { fullScreen: true, open: open, onClose: () => setOpen(false) },
            React.createElement(DialogTitle, null, t('settings.advanced.change_server')),
            React.createElement(DialogContent, { className: className },
                React.createElement(TextField, { fullWidth: true, error: !isValidURL, spellCheck: false, label: t('settings.advanced.voice_server'), value: currentURL, onChange: handleChange, variant: "outlined", color: "primary", helperText: isValidURL ? '' : t('settings.advanced.voice_server') }),
                React.createElement(Alert, { severity: "error" }, t('settings.advanced.voice_server_warning')),
                React.createElement(Button, { color: "primary", variant: "contained", onClick: () => {
                        setOpen(false);
                        setURLValid(true);
                        onValidURL('https://bettercrewl.ink');
                    } }, t('settings.advanced.reset_default'))),
            React.createElement(DialogActions, null,
                React.createElement(Button, { color: "primary", onClick: () => {
                        setURLValid(true);
                        setOpen(false);
                        setCurrentURL(initialURL);
                    } }, t('buttons.cancel')),
                React.createElement(Button, { disabled: !isValidURL, color: "primary", onClick: () => {
                        setOpen(false);
                        let url = currentURL;
                        if (url.endsWith('/'))
                            url = url.substring(0, url.length - 1);
                        onValidURL(url);
                    } }, t('buttons.confirm'))))));
};
const ServerURLInput = React.memo(RawServerURLInput);
export default ServerURLInput;
//# sourceMappingURL=ServerURLInput.js.map