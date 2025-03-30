import ts from 'typescript'
import * as fsp from 'node:fs/promises'
import path from 'node:path'

const directory = process.argv[2] || '.'
const srcDirectory = path.join(directory, 'src')
const outDirectory = path.join(directory, 'dist')
const generatedDirectory = path.join(outDirectory, 'generated')

const run = async () => {
  const options: ts.CompilerOptions = {
    lib: [],
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleDetection: ts.ModuleDetectionKind.Force,
    jsx: ts.JsxEmit.ReactJSX,
    allowJs: true,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    outDir: outDirectory,
    strict: true,
    skipLibCheck: true,
    noFallthroughCasesInSwitch: true,
    noUnusedLocals: false,
    noUnusedParameters: false,
    noPropertyAccessFromIndexSignature: false,
    declaration: true,
  }

  const fileNames = [path.join(srcDirectory, 'index.ts')]

  const program = ts.createProgram(fileNames, options)

  const emitResult = program.emit()

  const allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics)
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)

  for (const diagnostic of allDiagnostics) {
    if (diagnostic.file && diagnostic.start !== undefined) {
      const { line, character } = ts.getLineAndCharacterOfPosition(
        diagnostic.file,
        diagnostic.start,
      )
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n',
      )
      console.log(
        `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`,
      )
    } else {
      console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    }
  }

  const exitCode = emitResult.emitSkipped ? 1 : 0

  if (exitCode === 0) {
    // Check if the 'generated' directory exists in 'dist' and delete it
    try {
      const stats = await fsp.stat(generatedDirectory)
      if (stats.isDirectory())
        await fsp.rm(generatedDirectory, { recursive: true, force: true })
    } catch (error: any) {
      if (error.code !== 'ENOENT')
        console.error(`Error deleting directory: ${error.message}`)
    }

    const srcDirectoryInOutput = path.join(outDirectory, 'src')

    try {
      const stats = await fsp.stat(srcDirectoryInOutput)

      if (stats.isDirectory()) {
        // Move contents of 'src' within 'dist' to the root of the 'dist' directory
        const files = await fsp.readdir(srcDirectoryInOutput)
        for (const file of files) {
          const srcFilePath = path.join(srcDirectoryInOutput, file)
          const destFilePath = path.join(outDirectory, file)

          const stat = await fsp.lstat(srcFilePath)
          if (stat.isDirectory()) {
            await fsp.cp(srcFilePath, destFilePath, { recursive: true })
          } else {
            await fsp.copyFile(srcFilePath, destFilePath)
          }
        }

        await fsp.rm(srcDirectoryInOutput, { recursive: true, force: true })
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT')
        console.error(`Error moving files: ${error.message}`)
    }
  }

  process.exit(exitCode)
}

run()
