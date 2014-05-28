declare module 'uglify-js' {
	export function parse(code: string, options?: ParseOptions): AST_Toplevel;

	export interface ParseOptions {
		strict?: boolean;
		filename?: string;
		toplevel?: AST_Toplevel;
	}

	/**
	 * A setter/getter function.  The `name` property is always null.
	 */
	export class AST_Accessor extends AST_Lambda {
	}

	/**
	 * An array literal
	 */
	export class AST_Array extends AST_Node {
		/**
		 * array of elements
		 */
		elements: AST_Node[];
	}

	/**
	 * An assignment expression — `a = b + 5`
	 */
	export class AST_Assign extends AST_Binary {
	}

	/**
	 * Base class for atoms
	 */
	export class AST_Atom extends AST_Constant {
	}

	/**
	 * Binary expression, i.e. `a + b`
	 */
	export class AST_Binary extends AST_Node {
		/**
		 * left-hand side expression
		 */
		left: AST_Node;
		/**
		 * the operator
		 */
		operator: string;
		/**
		 * right-hand side expression
		 */
		right: AST_Node;
	}

	/**
	 * A body of statements (usually bracketed)
	 */
	export class AST_Block extends AST_Statement {
		/**
		 * an array of statements
		 */
		body: AST_Statement[];
	}

	/**
	 * A block statement
	 */
	export class AST_BlockStatement extends AST_Block {
	}

	/**
	 * Base class for booleans
	 */
	export class AST_Boolean extends AST_Atom {
	}

	/**
	 * A `break` statement
	 */
	export class AST_Break extends AST_LoopControl {
	}

	/**
	 * A function call expression
	 */
	export class AST_Call extends AST_Node {
		/**
		 * expression to invoke as function
		 */
		expression: AST_Node;
		/**
		 * array of arguments
		 */
		args: AST_Node[];
	}

	/**
	 * A `case` switch branch
	 */
	export class AST_Case extends AST_SwitchBranch {
		/**
		 * the `case` expression
		 */
		expression: AST_Node;
	}

	/**
	 * A `catch` node; only makes sense as part of a `try` statement
	 */
	export class AST_Catch extends AST_Block {
		/**
		 * symbol for the exception
		 */
		argname: AST_SymbolCatch;
	}

	/**
	 * Conditional expression using the ternary operator, i.e. `a ? b : c`
	 */
	export class AST_Conditional extends AST_Node {
		/**
		 * [AST_Node]
		 */
		condition: any;
		/**
		 * [AST_Node]
		 */
		consequent: any;
		/**
		 * [AST_Node]
		 */
		alternative: any;
	}

	/**
	 * A `const` statement
	 */
	export class AST_Const extends AST_Definitions {
	}

	/**
	 * Base class for all constants
	 */
	export class AST_Constant extends AST_Node {
	}

	/**
	 * A `continue` statement
	 */
	export class AST_Continue extends AST_LoopControl {
	}

	/**
	 * Base class for do/while statements
	 */
	export class AST_DWLoop extends AST_IterationStatement {
		/**
		 * the loop condition.  Should not be instanceof AST_Statement
		 */
		condition: AST_Node;
	}

	/**
	 * Represents a debugger statement
	 */
	export class AST_Debugger extends AST_Statement {
	}

	/**
	 * A `default` switch branch
	 */
	export class AST_Default extends AST_SwitchBranch {
	}

	/**
	 * Base class for `var` or `const` nodes (variable declarations/initializations)
	 */
	export class AST_Definitions extends AST_Statement {
		/**
		 * array of variable definitions
		 */
		definitions: AST_VarDef[];
	}

	/**
	 * A function definition
	 */
	export class AST_Defun extends AST_Lambda {
	}

	/**
	 * Represents a directive, like "use strict";
	 */
	export class AST_Directive extends AST_Statement {
		/**
		 * The value of this directive as a plain string (it's not an AST_String!)
		 */
		value: string;
		/**
		 * The scope that this directive affects. This property is only available after a call to toplevel.figure_out_scope
		 */
		scope: AST_Scope;
	}

	/**
	 * A `do` statement
	 */
	export class AST_Do extends AST_DWLoop {
	}

	/**
	 * A dotted property access expression
	 */
	export class AST_Dot extends AST_PropAccess {
	}

	/**
	 * The empty statement (empty block or simply a semicolon)
	 */
	export class AST_EmptyStatement extends AST_Statement {
	}

	/**
	 * Base class for “exits” (`return` and `throw`)
	 */
	export class AST_Exit extends AST_Jump {
		/**
		 * the value returned or thrown by this statement; could be null for AST_Return
		 */
		value: AST_Node;
	}

	/**
	 * The `false` atom
	 */
	export class AST_False extends AST_Boolean {
	}

	/**
	 * A `finally` node; only makes sense as part of a `try` statement
	 */
	export class AST_Finally extends AST_Block {
	}

	/**
	 * A `for` statement
	 */
	export class AST_For extends AST_IterationStatement {
		/**
		 * the `for` initialization code, or null if empty
		 */
		init: AST_Node;
		/**
		 * the `for` termination clause, or null if empty
		 */
		condition: AST_Node;
		/**
		 * the `for` update clause, or null if empty
		 */
		step: AST_Node;
	}

	/**
	 * A `for ... in` statement
	 */
	export class AST_ForIn extends AST_IterationStatement {
		/**
		 * the `for/in` initialization code
		 */
		init: AST_Node;
		/**
		 * the loop variable, only if `init` is AST_Var
		 */
		name: AST_SymbolRef;
		/**
		 * the object that we're looping through
		 */
		object: AST_Node;
	}

	/**
	 * A function expression
	 */
	export class AST_Function extends AST_Lambda {
	}

	/**
	 * A hole in an array
	 */
	export class AST_Hole extends AST_Atom {
	}

	/**
	 * A `if` statement
	 */
	export class AST_If extends AST_StatementWithBody {
		/**
		 * the `if` condition
		 */
		condition: AST_Node;
		/**
		 * the `else` part, or null if not present
		 */
		alternative: AST_Statement;
	}

	/**
	 * The `Infinity` value
	 */
	export class AST_Infinity extends AST_Atom {
	}

	/**
	 * Internal class.  All loops inherit from it.
	 */
	export class AST_IterationStatement extends AST_StatementWithBody {
	}

	/**
	 * Base class for “jumps” (for now that's `return`, `throw`, `break` and `continue`)
	 */
	export class AST_Jump extends AST_Statement {
	}

	/**
	 * Symbol naming a label (declaration)
	 */
	export class AST_Label extends AST_Symbol {
		/**
		 * a list of nodes referring to this label
		 */
		references: AST_LoopControl[];
	}

	/**
	 * Reference to a label symbol
	 */
	export class AST_LabelRef extends AST_Symbol {
	}

	/**
	 * Statement with a label
	 */
	export class AST_LabeledStatement extends AST_StatementWithBody {
		/**
		 * a label definition
		 */
		label: AST_Label;
	}

	/**
	 * Base class for functions
	 */
	export class AST_Lambda extends AST_Scope {
		/**
		 * the name of this function
		 */
		name: AST_SymbolDeclaration;
		/**
		 * array of function arguments
		 */
		argnames: AST_SymbolFunarg[];
		/**
		 * tells whether this function accesses the arguments array. This property is only available after a call to toplevel.figure_out_scope
		 */
		uses_arguments: boolean;
	}

	/**
	 * Base class for loop control statements (`break` and `continue`)
	 */
	export class AST_LoopControl extends AST_Jump {
		/**
		 * the label, or null if none
		 */
		label: AST_LabelRef;
	}

	/**
	 * The impossible value
	 */
	export class AST_NaN extends AST_Atom {
	}

	/**
	 * An object instantiation.  Derives from a function call since it has exactly the same properties
	 */
	export class AST_New extends AST_Call {
	}

	/**
	 * Base class of all AST nodes
	 */
	export class AST_Node {
		walk(visitor: TreeWalker);
		/**
		 * The first token of this node
		 */
		start: AST_Token;
		/**
		 * The last token of this node
		 */
		end: AST_Token;
	}

	/**
	 * The `null` atom
	 */
	export class AST_Null extends AST_Atom {
	}

	/**
	 * A number literal
	 */
	export class AST_Number extends AST_Constant {
		/**
		 * the numeric value
		 */
		value: number;
	}

	/**
	 * An object literal
	 */
	export class AST_Object extends AST_Node {
		/**
		 * array of properties
		 */
		properties: AST_ObjectProperty[];
	}

	/**
	 * An object getter property
	 */
	export class AST_ObjectGetter extends AST_ObjectProperty {
	}

	/**
	 * A key: value object property
	 */
	export class AST_ObjectKeyVal extends AST_ObjectProperty {
	}

	/**
	 * Base class for literal object properties
	 */
	export class AST_ObjectProperty extends AST_Node {
		/**
		 * the property name converted to a string for ObjectKeyVal.  For setters and getters this is an arbitrary AST_Node.
		 */
		key: string;
		/**
		 * property value.  For setters and getters this is an AST_Function.
		 */
		value: AST_Node;
	}

	/**
	 * An object setter property
	 */
	export class AST_ObjectSetter extends AST_ObjectProperty {
	}

	/**
	 * Base class for property access expressions, i.e. `a.foo` or `a["foo"]`
	 */
	export class AST_PropAccess extends AST_Node {
		/**
		 * the “container” expression
		 */
		expression: AST_Node;
		/**
		 * the property to access.  For AST_Dot this is always a plain string, while for AST_Sub it's an arbitrary AST_Node
		 */
		property: any;
	}

	/**
	 * A regexp literal
	 */
	export class AST_RegExp extends AST_Constant {
		/**
		 * the actual regexp
		 */
		value: RegExp;
	}

	/**
	 * A `return` statement
	 */
	export class AST_Return extends AST_Exit {
	}

	/**
	 * Base class for all statements introducing a lexical scope
	 */
	export class AST_Scope extends AST_Block {
		/**
		 * an array of directives declared in this scope. This property is only available after a call to toplevel.figure_out_scope
		 */
		directives: string[];
		/**
		 * a map of name -> SymbolDef for all variables/functions defined in this scope. This property is only available after a call to toplevel.figure_out_scope
		 */
		variables: Object;
		/**
		 * like `variables`, but only lists function declarations. This property is only available after a call to toplevel.figure_out_scope
		 */
		functions: Object;
		/**
		 * tells whether this scope uses the `with` statement. This property is only available after a call to toplevel.figure_out_scope
		 */
		uses_with: boolean;
		/**
		 * tells whether this scope contains a direct call to the global `eval`. This property is only available after a call to toplevel.figure_out_scope
		 */
		uses_eval: boolean;
		/**
		 * link to the parent scope. This property is only available after a call to toplevel.figure_out_scope
		 */
		parent_scope: AST_Scope;
		/**
		 * a list of all symbol definitions that are accessed from this scope or any subscopes. This property is only available after a call to toplevel.figure_out_scope
		 */
		enclosed: SymbolDef[];
		/**
		 * current index for mangling variables (used internally by the mangler). This property is only available after a call to toplevel.figure_out_scope
		 */
		cname: number;
	}

	/**
	 * A sequence expression (two comma-separated expressions)
	 */
	export class AST_Seq extends AST_Node {
		/**
		 * first element in sequence
		 */
		car: AST_Node;
		/**
		 * second element in sequence
		 */
		cdr: AST_Node;
	}

	/**
	 * A statement consisting of an expression, i.e. a = 1 + 2
	 */
	export class AST_SimpleStatement extends AST_Statement {
		/**
		 * an expression node (should not be instanceof AST_Statement)
		 */
		body: AST_Node;
	}

	/**
	 * Base class of all statements
	 */
	export class AST_Statement extends AST_Node {
	}

	/**
	 * Base class for all statements that contain one nested body: `For`, `ForIn`, `Do`, `While`, `With`
	 */
	export class AST_StatementWithBody extends AST_Statement {
		/**
		 * the body; this should always be present, even if it's an AST_EmptyStatement
		 */
		body: AST_Statement;
	}

	/**
	 * A string literal
	 */
	export class AST_String extends AST_Constant {
		/**
		 * the contents of this string
		 */
		value: string;
	}

	/**
	 * Index-style property access, i.e. `a["foo"]`
	 */
	export class AST_Sub extends AST_PropAccess {
	}

	/**
	 * A `switch` statement
	 */
	export class AST_Switch extends AST_Block {
		/**
		 * the `switch` “discriminant”
		 */
		expression: AST_Node;
	}

	/**
	 * Base class for `switch` branches
	 */
	export class AST_SwitchBranch extends AST_Block {
	}

	/**
	 * Base class for all symbols
	 */
	export class AST_Symbol extends AST_Node {
		/**
		 * the current scope (not necessarily the definition scope). This property is only available after a call to toplevel.figure_out_scope
		 */
		scope: AST_Scope;
		/**
		 * name of this symbol
		 */
		name: string;
		/**
		 * the definition of this symbol. This property is only available after a call to toplevel.figure_out_scope
		 */
		thedef: SymbolDef;
	}

	/**
	 * The name of a property accessor (setter/getter function)
	 */
	export class AST_SymbolAccessor extends AST_Symbol {
	}

	/**
	 * Symbol naming the exception in catch
	 */
	export class AST_SymbolCatch extends AST_SymbolDeclaration {
	}

	/**
	 * A constant declaration
	 */
	export class AST_SymbolConst extends AST_SymbolDeclaration {
	}

	/**
	 * A declaration symbol (symbol in var/const, function name or argument, symbol in catch)
	 */
	export class AST_SymbolDeclaration extends AST_Symbol {
		/**
		 * array of initializers for this declaration.. This property is only available after a call to toplevel.figure_out_scope
		 */
		init: AST_Node[];
	}

	/**
	 * Symbol defining a function
	 */
	export class AST_SymbolDefun extends AST_SymbolDeclaration {
	}

	/**
	 * Symbol naming a function argument
	 */
	export class AST_SymbolFunarg extends AST_SymbolVar {
	}

	/**
	 * Symbol naming a function expression
	 */
	export class AST_SymbolLambda extends AST_SymbolDeclaration {
	}

	/**
	 * Reference to some symbol (not definition/declaration)
	 */
	export class AST_SymbolRef extends AST_Symbol {
	}

	/**
	 * Symbol defining a variable
	 */
	export class AST_SymbolVar extends AST_SymbolDeclaration {
	}

	/**
	 * The `this` symbol
	 */
	export class AST_This extends AST_Symbol {
	}

	/**
	 * A `throw` statement
	 */
	export class AST_Throw extends AST_Exit {
	}

	export class AST_Token {
		type: any;
		value: any;
		line: any;
		col: any;
		pos: any;
		endpos: any;
		nlb: any;
		comments_before: any;
		file: any;
	}

	/**
	 * The toplevel scope
	 */
	export class AST_Toplevel extends AST_Scope {
		figure_out_scope(options?: {screw_ie8:boolean});
		/**
		 * a map of name -> SymbolDef for all undeclared names. This property is only available after a call to toplevel.figure_out_scope
		 */
		globals: Object;
	}

	/**
	 * The `true` atom
	 */
	export class AST_True extends AST_Boolean {
	}

	/**
	 * A `try` statement
	 */
	export class AST_Try extends AST_Block {
		/**
		 * the catch block, or null if not present
		 */
		bcatch: AST_Catch;
		/**
		 * the finally block, or null if not present
		 */
		bfinally: AST_Finally;
	}

	/**
	 * Base class for unary expressions
	 */
	export class AST_Unary extends AST_Node {
		/**
		 * the operator
		 */
		operator: string;
		/**
		 * expression that this unary operator applies to
		 */
		expression: AST_Node;
	}

	/**
	 * Unary postfix expression, i.e. `i++`
	 */
	export class AST_UnaryPostfix extends AST_Unary {
	}

	/**
	 * Unary prefix expression, i.e. `typeof i` or `++i`
	 */
	export class AST_UnaryPrefix extends AST_Unary {
	}

	/**
	 * The `undefined` value
	 */
	export class AST_Undefined extends AST_Atom {
	}

	/**
	 * A `var` statement
	 */
	export class AST_Var extends AST_Definitions {
	}

	/**
	 * A variable declaration; only appears in a AST_Definitions node
	 */
	export class AST_VarDef extends AST_Node {
		/**
		 * name of the variable
		 */
		name: any;
		/**
		 * initializer, or null of there's no initializer
		 */
		value: AST_Node;
	}

	/**
	 * A `while` statement
	 */
	export class AST_While extends AST_DWLoop {
	}

	/**
	 * A `with` statement
	 */
	export class AST_With extends AST_StatementWithBody {
		/**
		 * the `with` expression
		 */
		expression: AST_Node;
	}



	export class SymbolDef {
		name: string;
		orig: AST_SymbolDeclaration[];
		scope: AST_Scope;
		references: AST_SymbolRef[];
		global: boolean;
		undeclared: boolean;
		constant: boolean;
		mangled_name: boolean;
	}

	export class TreeWalker {
		constructor(visitor: (node: AST_Node, descend: () => void) => boolean);
		constructor(visitor: (node: AST_Node, descend: () => void) => void);

		parent(n?: number): AST_Node;
		stack: AST_Node[];
		find_parent<T extends AST_Node>(type: { new(): T} ): T;
		in_boolean_context(): boolean;
		loopcontrol_target(label?: string): AST_Block;
	}
}
