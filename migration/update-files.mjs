import { globby } from 'globby';
import fs from 'fs';
import { parse } from '@babel/core';
import MagicString from 'magic-string';
import { walk } from 'estree-walker';

function isRequire (node) {
  return true
    && node.type === 'VariableDeclaration'
    && node.declarations.length === 1
    && node.declarations[0].init.type === 'CallExpression'
    && node.declarations[0].init.callee.type === 'Identifier'
    && node.declarations[0].init.callee.name === 'require';
}

function isModuleExports (node) {
  return true
    && node.type === 'ExpressionStatement'
    && node.expression.type === 'AssignmentExpression'
    && node.expression.operator === '='
    && node.expression.left.type === 'MemberExpression'
    && node.expression.left.object.name === 'module'
    && node.expression.left.property.name === 'exports'
    && true;
}

function isExportedFunction (node, exportParts) {
  return true
    && node.type === 'FunctionDeclaration'
    && exportParts.includes(node.id.name)
    && true;
}

function isDefaultExportFunction (node, defaultExport) {
  return true
    && node.type === 'FunctionDeclaration'
    && node.id.name === defaultExport
    && true;
}

function removeUseStrict (code) {
  return code.replace(/^'use strict';\s+/, '');
}

function trimEnd (code) {
  return code
    .trimEnd() + '\n';
}

function replaceRequiresWithImports (code) {

  const ast = parse(code);
  const ms = new MagicString(code);
  const body = ast.program.body;

  let exportParts = [];
  let defaultExport = null;
  walk(ast, {
    enter (node, parent, prop, index) {
      if (body.includes(node) && isModuleExports(node)) {
        if (node.expression.right.type === 'Identifier') {
          defaultExport = node.expression.right.name;
          ms.overwrite(node.start, node.end, '');
        }
        if (node.expression.right.type === 'ObjectExpression') {
          exportParts = node.expression.right.properties.map((p) => p.value.name);
          ms.overwrite(node.start, node.end, '');
        }
      }
    },
  });

  walk(ast, {
    enter (node, parent, prop, index) {
      if (body.includes(node) && isExportedFunction(node, exportParts)) {
        ms.appendLeft(node.start, 'export ');
      }
      if (body.includes(node) && isDefaultExportFunction(node, defaultExport)) {
        ms.appendLeft(node.start, 'export default ');
      }
    },
  });

  walk(ast, {
    enter (node, parent, prop, index) {
      if (body.includes(node) && isRequire(node)) {
        const importPath = node.declarations[0].init.arguments[0].value;
        if (node.declarations[0].id.type === 'ObjectPattern') {
          const importParts = node.declarations[0].id.properties
            .map((o) => {
              return (o.key.name === o.value.name)
                ? o.key.name
                : `${o.key.name} as ${o.value.name}`;
            })
            .join(', ');
          ms.overwrite(node.start, node.end, `import { ${importParts} } from '${importPath}';`);
        }
        else if (node.declarations[0].id.type === 'Identifier') {
          const defaultImportName = node.declarations[0].id.name;
          ms.overwrite(node.start, node.end, `import ${defaultImportName} from '${importPath}';`);
        }
      }
    },
  });

  const newCode = ms.toString();
  return newCode;
}

async function run () {

  const fileList = await globby([
    'bin/*.js',
    'scripts/**/*.js',
    'src/**/*.js',
    // 'src/commands/accesslogs.js',
    // 'src/commands/env.js',
  ]);
  // console.log(`${fileList.length} files`);

  for (const file of fileList) {

    // const newFile = file.replace(/\.js$/, '.mjs');
    const newFile = file;
    console.log(file);

    const code = fs.readFileSync(file, { encoding: 'utf8' });
    const codeWithoutUseStrict = removeUseStrict(code);
    const codeWithImports = replaceRequiresWithImports(codeWithoutUseStrict);
    const codeWithCleanEnd = trimEnd(codeWithImports);

    fs.writeFileSync(newFile, codeWithCleanEnd);
  }
}

run();
