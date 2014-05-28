declare module 'chalk' {
	export interface ColorStyle {
		(str: string): string;

		reset: ColorStyle;
		bold: ColorStyle;
		italic: ColorStyle;
		underline: ColorStyle;
		inverse: ColorStyle;
		strikethrough: ColorStyle;
		black: ColorStyle;
		red: ColorStyle;
		green: ColorStyle;
		yellow: ColorStyle;
		blue: ColorStyle;
		magenta: ColorStyle;
		cyan: ColorStyle;
		white: ColorStyle;
		gray: ColorStyle;
		bgBlack: ColorStyle;
		bgRed: ColorStyle;
		bgGreen: ColorStyle;
		bgYellow: ColorStyle;
		bgBlue: ColorStyle;
		bgMagenta: ColorStyle;
		bgCyan: ColorStyle;
		bgWhite: ColorStyle;
	}
	export var reset: ColorStyle;
	export var bold: ColorStyle;
	export var italic: ColorStyle;
	export var underline: ColorStyle;
	export var inverse: ColorStyle;
	export var strikethrough: ColorStyle;
	export var black: ColorStyle;
	export var red: ColorStyle;
	export var green: ColorStyle;
	export var yellow: ColorStyle;
	export var blue: ColorStyle;
	export var magenta: ColorStyle;
	export var cyan: ColorStyle;
	export var white: ColorStyle;
	export var gray: ColorStyle;
	export var bgBlack: ColorStyle;
	export var bgRed: ColorStyle;
	export var bgGreen: ColorStyle;
	export var bgYellow: ColorStyle;
	export var bgBlue: ColorStyle;
	export var bgMagenta: ColorStyle;
	export var bgCyan: ColorStyle;
	export var bgWhite: ColorStyle;
}
