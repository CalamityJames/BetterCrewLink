import React from 'react';
import Footer from './Footer';
import makeStyles from '@material-ui/core/styles/makeStyles';
import CircularProgress from '@material-ui/core/CircularProgress';
import Typography from '@material-ui/core/Typography';
import SupportLink from './SupportLink';
import LaunchButton from './LaunchButton';
const useStyles = makeStyles((theme) => ({
    root: {
        width: '100vw',
        height: '100vh',
        paddingTop: theme.spacing(3),
    },
    error: {
        paddingTop: theme.spacing(4),
    },
    menu: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'start',
    },
    waiting: {
        fontSize: 20,
        marginTop: 12,
        marginBottom: 12,
    },
    open_message: {
        fontSize: 24,
        marginTop: '15px',
        marginBottom: '5px',
    },
}));
const Menu = function ({ t, error }) {
    const classes = useStyles();
    return (React.createElement("div", { className: classes.root },
        React.createElement("div", { className: classes.menu },
            error ? (React.createElement("div", { className: classes.error },
                React.createElement(Typography, { align: "center", variant: "h6", color: "error" }, t('game.error')),
                React.createElement(Typography, { align: "center", style: { whiteSpace: 'pre-wrap' } }, error),
                React.createElement(SupportLink, null))) : (React.createElement(React.Fragment, null,
                React.createElement("span", { className: classes.waiting }, t('game.waiting')),
                React.createElement(CircularProgress, { color: "primary", size: 40 }),
                React.createElement("span", { className: classes.open_message }, t('game.open')),
                React.createElement(LaunchButton, { t: t }))),
            React.createElement(Footer, null))));
};
export default Menu;
//# sourceMappingURL=Menu.js.map