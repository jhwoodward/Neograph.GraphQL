var fs = require('fs');
var StringBuilder = require('stringbuilder')

// create an StringBuilder();
var main = new StringBuilder( {newline:'\r\n'} );
//var sbInside = new StringBuilder( {newline:'\r\n'} );

// you can configure all new intances of the StringBuilder
// as default win32='\r\n' others='\n'
// StringBuilder.configure({newline:'\r\n'});

//sb.append('some text') // append text
//sb.append('{0:YYYY}', new Date()) // append text formatted
//sb.appendLine('some text') // append a new line
//sb.appendLine('{0:$ 0.1}', 50.1044) // append a new line formatted
//ab.append( sbInside );  // append other StringBuilder into sb
                        // you can append text into `sbInside` after that                        

//sbInside.append('another text');

var sImport ="import {GraphQLSchema,GraphQLObjectType,GraphQLInt,GraphQLString,GraphQLList,GraphQLBoolean} from 'graphql'";

var sListOptions =  "let listOptions = new GraphQLObjectType({    name: 'ListOptions',    fields:() => ({        pageNum:{type:GraphQLInt},        pageSize:{type:GraphQLInt},        sort:{type:GraphQLString},        sortOrder:{type:GraphQLString},        format:{type:GraphQLString}    })});"


main.appendLine(sImport);
main.appendLine(sListOptions);

var filename = './api/graphql/schema.generated.js';
var stream = fs.createWriteStream( filename, 'utf-8' );

main.pipe(stream);
main.flush();

