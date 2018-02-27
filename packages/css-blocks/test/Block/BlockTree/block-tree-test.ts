import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import {
  Container,
  SinkContainer,
  SourceContainer,
} from "../../../src/Block/BlockTree";

class TestSource extends SourceContainer<
  TestSource, // Self
  TestNode    // Children
> {
  protected newChild(name: string) { return new TestNode(name, this); }
  lookup(): undefined { return undefined; }
  newChildNode: SourceContainer<TestSource, TestNode>['newChild'] =
    (name: string) => this.newChild(name)

  getChildNode: SourceContainer<TestSource, TestNode>['getChild'] =
    (key: string) => this.getChild(key)

  resolveChildNode: SourceContainer<TestSource, TestNode>['resolveChild'] =
    (key: string) => this.resolveChild(key)

  setChildNode: SourceContainer<TestSource, TestNode>['setChild'] =
    (key: string, value: TestNode) => this.setChild(key, value)

  ensureChildNode: SourceContainer<TestSource, TestNode>['ensureChild'] =
    (name: string, key?: string) => this.ensureChild(name, key)

  childNodes: SourceContainer<TestSource, TestNode>['children'] =
    () => this.children()

  childNodeHash: SourceContainer<TestSource, TestNode>['childrenHash'] =
    () => this.childrenHash()

  childNodeMap: SourceContainer<TestSource, TestNode>['childrenMap'] =
    () => this.childrenMap()
}

class TestNode extends Container<
  TestNode,   // Self
  TestSource, // Root
  TestSource, // Parent
  TestSink    // Children
> {
  newChild(name: string) { return new TestSink(name, this); }
  lookup(): undefined { return undefined; }
  ensureSink: Container<TestNode, TestSource, TestSource, TestSink>['ensureChild'] =
    (name: string, key?: string) => this.ensureChild(name, key)
  getSink: Container<TestNode, TestSource, TestSource, TestSink>['getChild'] =
    (name: string) => this.getChild(name)
  resolveSink: Container<TestNode, TestSource, TestSource, TestSink>['resolveChild'] =
    (name: string) => this.resolveChild(name)
}

class TestSink extends SinkContainer<
  TestSink,   // Self
  TestSource, // Root
  TestNode    // Parent
> {}

@suite("BlockTree")
export class BlockTreeTests {

  @test "initial source node tree properties are as expected"() {
    let source = new TestSource("my-source");
    assert.equal(source.parent, null);
    assert.equal(source.base, undefined);
    assert.equal(source.root, source);
    assert.deepEqual(source.resolveInheritance(), []);
  }

  @test "newChild creates new child, does not set it"() { // Note: this is why `newChild` is protected in Blocks
    let source = new TestSource("my-source");
    let child = source.newChildNode("child-node");
    assert.equal(source.getChildNode("child-node"), null);
    assert.equal(source.resolveChildNode("child-node"), null);
    assert.equal(child.parent, source);
    assert.equal(child.base, undefined);
    assert.equal(child.root, source);
  }

  @test "setChild adds new child to parent"() {
    let source = new TestSource("my-source");
    let child = source.newChildNode("child-node");
    source.setChildNode("child-key", child);
    assert.equal(source.getChildNode("child-key"), child);
    assert.equal(source.resolveChildNode("child-key"), child);
  }

  @test "ensureChild creates and adds new child to parent"() {
    let source = new TestSource("my-source");
    let child = source.ensureChildNode("child-node");
    assert.equal(source.getChildNode("child-node"), child);
    assert.equal(source.resolveChildNode("child-node"), child);
  }

  @test "ensureChild accepts optional key"() {
    let source = new TestSource("my-source");
    let child = source.ensureChildNode("child-node", "child-key");
    assert.equal(source.getChildNode("child-key"), child);
    assert.equal(source.resolveChildNode("child-key"), child);
  }

  @test "ensureChild will not overwrite existing nodes"() {
    let source = new TestSource("my-source");
    let child1 = source.ensureChildNode("child-node");
    let child2 = source.ensureChildNode("child-node");
    assert.equal(child1, child2);
  }

  @test "children accessor methods work as expected"() {
    let source = new TestSource("my-source");
    let child1 = source.ensureChildNode("child1");
    let child2 = source.ensureChildNode("child2");
    let child3 = source.ensureChildNode("child3", "custom-key");

    assert.deepEqual(source.childNodes(), [child1, child2, child3]);
    assert.deepEqual(source.childNodeHash(), {child1, child2, "custom-key": child3});
    assert.deepEqual(source.childNodeMap(), new Map([["child1", child1], ["child2", child2], ["custom-key", child3]]));
  }

  @test "grandchildren have tree properties set as expected"() {
    let source = new TestSource("my-source");
    let child = source.ensureChildNode("child");
    let grandchild = child.ensureSink("grandchild");
    assert.equal(grandchild.parent, child);
    assert.equal(grandchild.base, undefined);
    assert.equal(grandchild.root, source);
    assert.deepEqual(grandchild.resolveInheritance(), []);
  }

  @test "setBase creates inheritance tree for self"() {
    let base = new TestSource("my-base");
    let source = new TestSource("my-source");
    source.setBase(base);
    assert.equal(source.base, base);
    assert.deepEqual(source.resolveInheritance(), [base]);
  }

  @test "setBase creates inheritance tree for children"() {
    let base = new TestSource("my-base");
    let source = new TestSource("my-source");
    let baseChild = base.ensureChildNode("child");
    let child = source.ensureChildNode("child");
    let baseUnique = base.ensureChildNode("base-only");
    source.setBase(base);

    assert.equal(child.base, baseChild);
    assert.equal(source.getChildNode("base-only"), null);
    assert.equal(source.resolveChildNode("base-only"), baseUnique);
    assert.deepEqual(child.resolveInheritance(), [baseChild]);
  }

  @test "setBase creates inheritance tree for grandchildren"() {
    let base = new TestSource("my-base");
    let source = new TestSource("my-source");
    let baseChild = base.ensureChildNode("child");
    let baseGrandchild = baseChild.ensureSink("grandchild");
    let baseChildUnique = baseChild.ensureSink("base-only");
    let child = source.ensureChildNode("child");
    let grandchild = child.ensureSink("grandchild");
    source.setBase(base);

    assert.equal(grandchild.base, baseGrandchild);
    assert.equal(source.getChildNode("child")!.getSink("base-only"), null);
    assert.equal(source.getChildNode("child")!.resolveSink("base-only"), baseChildUnique);
    assert.deepEqual(grandchild.resolveInheritance(), [baseGrandchild]);
  }
}
