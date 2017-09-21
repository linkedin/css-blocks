import { assert } from "chai";
import { suite, test, only } from "mocha-typescript";
import TypeGenerator from "../../src/TypeGenerator/TypeAST";

@suite("Type Generation")
export class TypeASTTests {

  @test "Registers simple class"() {
    let ast = new TypeGenerator('root');
    ast.addProp('test');
    ast.prune();
    assert.deepEqual(ast.toJSON(), {
      "name": "Root",
      "children": {},
      "methods": {},
      "properties": {
        "test": []
      }
    });
  }

  @test "Registers root state"() {
    let ast = new TypeGenerator('root');
    ast.addMethod('test');
    ast.prune();
    assert.deepEqual(ast.toJSON(), {
      "name": "Root",
      "children": {},
      "methods": {
        "test": []
      },
      "properties": {}
    });
  }

  @test "Registers states with substates"() {
    let ast = new TypeGenerator('root');

    ast.addMethod('test1', 'foo');
    ast.addMethod('test1', 'bar');
    ast.addMethod('test2', 'biz');
    ast.addMethod('test2', 'baz', 1);
    ast.prune();

    assert.deepEqual(ast.toJSON(), {
      "name": "Root",
      "children": {},
      "methods": {
        "test1": [ ['foo', 'bar'] ],
        "test2": [ ['biz'], ['baz'] ]
      },
      "properties": {}
    });
  }

  @test "Registers root state and class of same name"() {
    let ast = new TypeGenerator('root');
    ast.addMethod('test');
    ast.addProp('test');
    ast.prune();
    assert.deepEqual(ast.toJSON(), {
      "name": "Root",
      "children": {
        "TestState": {
          name: "TestState",
          args: [ ]
        }
      },
      "methods": {},
      "properties": {
        "test": [ "TestState" ]
      }
    });
  }

  @test "Registers class with state"() {
    let ast = new TypeGenerator('root');
    let klass = ast.addProp('test');
    klass.addMethod('foo');
    ast.prune();
    assert.deepEqual(ast.toJSON(), {
      "name": "Root",
      "children": {
        'TestClass': {
          "name": "TestClass",
          "children": {},
          "methods": {
            "foo": []
          },
          "properties": {}
        }
      },
      "methods": {},
      "properties": {
        "test": [ 'TestClass' ]
      }
    });
  }

  @test "Type idents in same file are guarenteed unique"() {
    let ast = new TypeGenerator('root');
    let klass1 = ast.addProp('test');
    let klass2 = klass1.addProp('test');
    klass2.addMethod('test');
    ast.prune();
    assert.deepEqual(ast.toJSON(), {
      "children": {
        "TestClass": {
          "children": {
            "TestClass1": {
              "name": "TestClass1",
              "children": {},
              "methods": {
                "test": []
              },
              "properties": {}
            }
          },
          "methods": {},
          "name": "TestClass",
          "properties": {
            "test": [ "TestClass1" ]
          }
        }
      },
      "methods": {},
      "name": "Root",
      "properties": {
        "test": [ "TestClass" ]
      }
    });
  }

  @test "Registers root state and class of same name and preserves state args"() {
    let ast = new TypeGenerator('root');
    ast.addMethod('test', 'foo');
    let klass = ast.addProp('test');
    klass.addMethod('test');
    ast.prune();
    assert.deepEqual(ast.toJSON(), {
      "name": "Root",
      "children": {
        "TestClass": {
          name: "TestClass",
          children: {},
          properties: {},
          methods: {
            "test": []
          }
        },
        "TestState": {
          name: "TestState",
          args: [ ['foo'] ]
        }
      },
      "methods": {},
      "properties": {
        "test": [ "TestClass", "TestState" ]
      }
    });
  }

}
