import * as path from "path"
import * as vscode from "vscode"
import nonce from "./nonce"

class EditorProvider implements vscode.CustomTextEditorProvider {

	// DO NOT EDIT
	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new EditorProvider(context)
		return vscode.window.registerCustomEditorProvider(EditorProvider.viewType, provider)
	}

	// DO NOT EDIT
	private static readonly viewType = "catCustoms.catScratch"

	// DO NOT EDIT
	constructor(private readonly context: vscode.ExtensionContext) {}

	/**
	 * Called when our custom editor is opened.
	 *
	 *
	 */
	public async resolveCustomTextEditor(
		document: vscode.TextDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken
	): Promise<void> {

		webviewPanel.webview.options = { enableScripts: true }
		webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview)

		// Sends an update-message.
		const updateWebview = () => {
			webviewPanel.webview.postMessage({
				type: "update",
				text: document.getText(),
			})
		}

		// Propagates state to the focused document; VSCode text
		// editor extensions are managed, so updateWebview
		// triggers a re-render.
		const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.uri.toString() !== document.uri.toString()) {
				// No-op
				return
			}
			updateWebview()
		})
		// Defer function.
		webviewPanel.onDidDispose(() => {
			changeDocumentSubscription.dispose()
		})

		// Resets the document on state changes.
		webviewPanel.webview.onDidReceiveMessage(e => {
			const edit = new vscode.WorkspaceEdit()
			edit.replace(
				document.uri,
				new vscode.Range(
					new vscode.Position(0, 0),
					new vscode.Position(document.lineCount, 0),
				),
				e.text,
			)
			vscode.workspace.applyEdit(edit)
		})

		// Invoke once; propgates state changes to background
		// documents:
		updateWebview()
	}

	// Return static HTML.
	private getHtmlForWebview(webview: vscode.Webview): string {
		const nonceID = nonce()

		const scriptURI = webview.asWebviewUri(vscode.Uri.file(
			path.join(this.context.extensionPath, "media", "catScratch.js")
		))
		const styleURI = webview.asWebviewUri(vscode.Uri.file(
			path.join(this.context.extensionPath, "media", "catScratch.css")
		))
		return (
			`<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonceID}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleURI}" rel="stylesheet" />
				<title>Codex Editor</title>
			</head>
			<body>
				<textarea></textarea>
				<script nonce="${nonceID}" src="${scriptURI}"></script>
			</body>
			</html>`
		)
	}

	// // Commits an editing operation; overwrites the document.
	// private commitEdit(document: vscode.TextDocument, text: string) {
	// 	const edit = new vscode.WorkspaceEdit()
	// 	edit.replace(
	// 		document.uri,
	// 		// NOTE: Overwrites the document; the third parameter,
	// 		// endLine, is zero-based, so a 0-count overwrites the
	// 		// document
	// 		new vscode.Range(0, 0, document.lineCount, 0),
	// 		text,
	// 	)
	// 	vscode.workspace.applyEdit(edit)
	// }
}

export default EditorProvider
