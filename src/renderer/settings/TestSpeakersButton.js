import React, { useState, useEffect } from 'react';
// @ts-ignore
import chime from '../../../static/sounds/chime.mp3';
import Button from '@material-ui/core/Button';
import makeStyles from '@material-ui/core/styles/makeStyles';
const useStyles = makeStyles(() => ({
    button: {
        width: 'fit-content',
        margin: '5px auto',
    },
}));
const audio = new Audio();
audio.src = chime;
const TestSpeakersButton = ({ t, speaker }) => {
    const classes = useStyles();
    const [playing, setPlaying] = useState(false);
    useEffect(() => {
        if (speaker.toLowerCase() !== 'default')
            audio.setSinkId(speaker);
        audio.onended = () => {
            setPlaying(false);
        };
    }, [speaker]);
    const testSpeakers = () => {
        if (playing) {
            audio.pause();
            audio.currentTime = 0;
            setPlaying(false);
        }
        else {
            audio.play();
            setPlaying(true);
        }
    };
    return (React.createElement(Button, { variant: "contained", color: "secondary", size: "small", className: classes.button, onClick: testSpeakers }, playing ? t('settings.audio.test_speaker_stop') : t('settings.audio.test_speaker_start')));
};
export default TestSpeakersButton;
//# sourceMappingURL=TestSpeakersButton.js.map