import createMuiTheme from '@material-ui/core/styles/createMuiTheme';
import { red } from '@material-ui/core/colors';

// Create a theme instance.
const theme = createMuiTheme({
	palette: {
		primary: {
			main: red[300],
		},
		secondary: red,
		background: {
			default: '#27232a',
			paper: '#272727',
		},
		type: 'dark',
	},
	overrides: {
		MuiTooltip: {
			tooltip: {
				fontSize: 16,
			},
		},
	},
});

export default theme;
