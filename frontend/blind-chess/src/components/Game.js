import React, { useEffect, useRef, useState } from 'react';

function Move(props) {
	const turn = props.turn || 1;
	const white = props.white || "";
	const black = props.black || "";

	return (
		<div className="Move">
			<span className="turn">{turn}.</span>
			<div className="sans">
				<span className="san">{white}</span>
				<span className="san">{black}</span>
			</div>
		</div>
	);
}

function Game(props) {
	const {conn, code} = props;
	const onLeave = props.onLeave || (() => {});
	const [game, setGame] = useState({
		History: [""],
		Error: "",
		Side: "",
		SideToMove: "",
		FEN: "",
		Loser: "",
		WhiteClock: 0,
		BlackClock: 0,
	});
	const whiteTime = useRef(undefined);
	const blackTime = useRef(undefined);

	const inputRef = useRef(undefined);
	const moveRef = useRef(undefined);

	useEffect(() => {
		if (!inputRef.current.disabled) inputRef.current.focus();
		moveRef.current.scrollTop = moveRef.current.scrollHeight;
	}, [game]);

	// useEffect(() => {
	// 	const countdown = () => {
	// 		setTimeout(() => {
	// 			game.WhiteTime -= 1;
	// 			const min = "0" + Math.floor(game.WhiteTime / 600);
	// 			const sec = "0" + Math.floor(game.WhiteTime / 10 % 60);
	// 			whiteTime.current.innerText = `${min.substring(min.length-2)}:${sec.substring(sec.length-2)}`;
	// 			if (game.WhiteTime > 0) countdown();
	// 		}, 100);
	// 	};
	// 	countdown();
	// });
	
	const moveElements = [];
	let turn = 1;
	if (game.History.length === 0) game.History = [""];
	for (let i = 0; i < game.History.length; i += 2, turn++) {
		moveElements.push(<Move key={turn} turn={turn} white={game.History[i]} black={(i + 1 < game.History.length) ? game.History[i + 1] : ""} />);
	}
	
	const updateGame = (state) => {
		setGame({...Object.assign(game, state)});
	};
	if (conn) {
		conn.onmessage = e => {
			const split = e.data.split("_");
			let msg = {
				cmd: split[0],
				args: split.slice(1),
			};

			if (msg.cmd === "END") {

			} else if (msg.cmd === "ERROR") {
				updateGame({Error: msg.args[0]});
			} else if (msg.cmd === "STATE") {
				updateGame(JSON.parse(msg.args[0]));
			}
		};
	}
	const enterMove = e => {
		if (e.charCode !== 13) return;
		const san = e.target.value;
		
		if (!conn || conn.readyState !== WebSocket.OPEN) return;
		conn.send(`MOVE_${san}`);

		e.target.value = "";
	};

	let info = undefined;
	if (game.FEN) {
		info = <a className="fen" href={`https://lichess.org/analysis/standard/${game.FEN}`} target="_blank" rel="noopener noreferrer">{game.FEN}</a>;
	} else {
		info = <span className="code">room code: { code }</span>;
	}

	let placeholder, prompt = false;
	if (game.Loser) placeholder = "Game over";
	else if (!game.FEN) placeholder = "Waiting for game to start";
	else if (game.Side === game.SideToMove) {
		placeholder = "Type your move";
		prompt = true;
	} else placeholder = "Waiting for opponent";

	let notification = undefined;
	if (game.Loser) {
		notification = (
			<div className="notification">
				<h3>Game Over</h3>
				{ (game.Loser === game.Side) ? "You lost :(" : (game.Loser === "-") ? "It's a draw" : "You won!" }
			</div>
		);
	}

	return (
		<div className="Game">
			{ notification }
			<div className="clocks">
				<div className="timer active">
					<span ref={whiteTime} className="time"></span>
				</div>
				<div className="timer">
					<span ref={blackTime} className="time"></span>
				</div>
			</div>
			<div ref={moveRef} className="moves">
				{ moveElements }
			</div>
			<div className="error">
				{ game.Error }
			</div>
			<div className="controls">
				<input ref={inputRef} className={prompt ? "prompt" : ""} type="text" onKeyPress={enterMove} placeholder={placeholder} disabled={!prompt} />
				<button className="leave" onClick={() => {
					if (conn) conn.send("QUIT");
					onLeave();
				}}>Leave</button>
			</div>
			{ info }
		</div>
	);
}

export default Game;
