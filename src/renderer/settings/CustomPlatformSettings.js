var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, Radio, RadioGroup, TextField, } from '@material-ui/core';
import makeStyles from '@material-ui/core/styles/makeStyles';
import React, { useMemo, useState, useEffect, useContext } from 'react';
import ChevronLeft from '@material-ui/icons/ArrowBack';
import { PlatformRunType } from '../../common/GamePlatform';
import path from 'path';
import { platform } from 'process';
import { SettingsContext } from '../contexts';
const useStyles = makeStyles((theme) => ({
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
    dialog: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'start',
        '&>*': {
            marginBottom: theme.spacing(1),
        },
    },
    radioGroup: {
        flexDirection: 'row',
    },
}));
export const CustomPlatformSettings = function ({ t, open, setOpenState, editPlatform, }) {
    const desktopPlatform = platform;
    const classes = useStyles();
    const [settings, setSettings] = useContext(SettingsContext);
    const [advanced, setAdvanced] = useState(false);
    const emptyCustomPlatform = {
        default: false,
        key: '',
        launchType: PlatformRunType.EXE,
        runPath: '',
        execute: [''],
        translateKey: '',
    };
    const [customPlatform, setCustomPlatform] = useState(emptyCustomPlatform);
    useEffect(() => {
        setCustomPlatform(editPlatform ? editPlatform : emptyCustomPlatform);
        if (editPlatform && editPlatform.execute.length > 1) {
            setAdvanced(true);
        }
        else {
            setAdvanced(false);
        }
    }, [open]);
    const setPlatformName = (name) => {
        setCustomPlatform((prevState) => (Object.assign(Object.assign({}, prevState), { key: name, translateKey: name })));
    };
    const setPlatformRunType = (runType) => {
        setCustomPlatform((prevState) => (Object.assign(Object.assign({}, prevState), { launchType: runType, runPath: '', execute: [''] })));
    };
    const setPlatformRun = (pathsString) => {
        if (customPlatform.launchType === PlatformRunType.EXE) {
            const exe = path.parse(pathsString);
            if (exe) {
                setCustomPlatform((prevState) => (Object.assign(Object.assign({}, prevState), { runPath: exe.dir, execute: [exe.base].concat(...prevState.execute.slice(1)) })));
            }
            else {
                setCustomPlatform((prevState) => (Object.assign(Object.assign({}, prevState), { runPath: '', execute: [''] })));
            }
        }
        else if (customPlatform.launchType === PlatformRunType.URI) {
            setCustomPlatform((prevState) => (Object.assign(Object.assign({}, prevState), { runPath: pathsString })));
        }
    };
    const setPlatformArgs = (args) => {
        if (args === '') {
            setCustomPlatform((prevState) => (Object.assign(Object.assign({}, prevState), { execute: [customPlatform.execute[0]] })));
        }
        else if (customPlatform.launchType === PlatformRunType.EXE) {
            setCustomPlatform((prevState) => (Object.assign(Object.assign({}, prevState), { execute: [customPlatform.execute[0]].concat(...args.split(' ')) })));
        }
    };
    // Delete and re-add platform if we're editing
    const saveCustomPlatform = () => {
        if (editPlatform && settings.customPlatforms[editPlatform.key]) {
            const _a = settings.customPlatforms, _b = editPlatform.key, remove = _a[_b], rest = __rest(_a, [typeof _b === "symbol" ? _b : _b + ""]);
            setSettings({
                type: 'setOne',
                action: [
                    'customPlatforms',
                    Object.assign(Object.assign({}, rest), { [customPlatform.key]: customPlatform }),
                ],
            });
        }
        else {
            setSettings({
                type: 'setOne',
                action: [
                    'customPlatforms',
                    Object.assign(Object.assign({}, settings.customPlatforms), { [customPlatform.key]: customPlatform }),
                ],
            });
        }
    };
    const deleteCustomPlatform = () => {
        const _a = settings.customPlatforms, _b = customPlatform.key, remove = _a[_b], rest = __rest(_a, [typeof _b === "symbol" ? _b : _b + ""]);
        setSettings({
            type: 'setOne',
            action: ['customPlatforms', rest],
        });
    };
    const runInputs = useMemo(() => {
        if (customPlatform.launchType === PlatformRunType.EXE) {
            return (React.createElement(React.Fragment, null,
                React.createElement(TextField, { fullWidth: true, label: t('settings.customplatforms.path'), value: customPlatform.execute[0] ? path.join(customPlatform.runPath, customPlatform.execute[0]) : '', variant: "outlined", color: "primary", disabled: true }),
                React.createElement(Button, { variant: "contained", component: "label" },
                    t('buttons.file_select'),
                    React.createElement("input", { accept: desktopPlatform === 'win32' ? '.exe' : '*', type: "file", hidden: true, onChange: (ev) => {
                            if (ev.target.files && ev.target.files.length > 0) {
                                setPlatformRun(ev.target.files[0].path);
                            }
                            else {
                                setPlatformRun('');
                            }
                        } })),
                React.createElement(FormControlLabel, { control: React.createElement(Checkbox, { checked: advanced, onChange: (_, checked) => {
                            setAdvanced(checked);
                            if (!checked) {
                                setPlatformArgs('');
                            }
                        } }), label: t('settings.customplatforms.advanced') }),
                advanced ? (React.createElement(TextField, { fullWidth: true, label: t('settings.customplatforms.arguments'), value: customPlatform.execute.slice(1).join(' '), onChange: (ev) => setPlatformArgs(ev.target.value), variant: "outlined", color: "primary" })) : null));
        }
        else {
            return (React.createElement(React.Fragment, null,
                React.createElement(TextField, { fullWidth: true, label: t('settings.customplatforms.uri'), value: customPlatform.runPath, onChange: (ev) => setPlatformRun(ev.target.value), variant: "outlined", color: "primary", disabled: false })));
        }
    }, [customPlatform, advanced]);
    return (React.createElement(React.Fragment, null,
        React.createElement(Dialog, { fullScreen: true, open: open },
            React.createElement("div", { className: classes.header },
                React.createElement(DialogTitle, null, t('settings.customplatforms.title')),
                React.createElement(IconButton, { className: classes.back, size: "small", onClick: () => setOpenState(false) },
                    React.createElement(ChevronLeft, { htmlColor: "#777" }))),
            React.createElement(DialogContent, { className: classes.dialog },
                React.createElement(TextField, { fullWidth: true, spellCheck: false, label: t('settings.customplatforms.platform_title'), value: customPlatform.key, onChange: (ev) => setPlatformName(ev.target.value), variant: "outlined", color: "primary", disabled: false }),
                React.createElement(RadioGroup, { className: classes.radioGroup, value: customPlatform.launchType, onChange: (ev) => {
                        setPlatformRunType(ev.target.value);
                    } },
                    React.createElement(FormControlLabel, { label: PlatformRunType.EXE, value: PlatformRunType.EXE, control: React.createElement(Radio, null) }),
                    React.createElement(FormControlLabel, { label: PlatformRunType.URI, value: PlatformRunType.URI, control: React.createElement(Radio, null) })),
                runInputs),
            React.createElement(DialogActions, null,
                React.createElement(Button, { color: "primary", onClick: () => {
                        deleteCustomPlatform();
                        setCustomPlatform(emptyCustomPlatform);
                        setOpenState(false);
                    } }, t('buttons.delete')),
                React.createElement(Button, { color: "primary", onClick: () => {
                        saveCustomPlatform();
                        setCustomPlatform(emptyCustomPlatform);
                        setOpenState(false);
                    } }, t('buttons.confirm'))))));
};
//# sourceMappingURL=CustomPlatformSettings.js.map