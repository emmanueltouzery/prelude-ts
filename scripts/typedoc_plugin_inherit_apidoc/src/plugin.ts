import { Reflection } from "../node_modules/typedoc/dist/lib/models/reflections/abstract";
import { ReflectionKind, DeclarationReflection, SignatureReflection } from "../node_modules/typedoc/dist/lib/models/reflections";
import { Component, ConverterComponent } from "../node_modules/typedoc/dist/lib/converter/components";
import { Converter } from "../node_modules/typedoc/dist/lib/converter/converter";
import { Context } from "../node_modules/typedoc/dist/lib/converter/context";
import { CommentPlugin } from "../node_modules/typedoc/dist/lib/converter/plugins/CommentPlugin";
import { getRawComment } from "../node_modules/typedoc/dist/lib/converter/factories/comment";
import { Options, OptionsReadMode } from "../node_modules/typedoc/dist/lib/utils/options";
import { Type, ReferenceType } from '../node_modules/typedoc/dist/lib/models/types/index';

/**
 * This typedoc plugin will copy comments from parent classes to classes
 * inheriting from them. This is useful to avoid us from copy-pasting
 * comments in Option in the Some and None classes, same for Either and
 * Left and Right.
 */
@Component({name:'inherit-api'})
export class InheritApiPlugin extends ConverterComponent {
    /**
     * Create a new ImplementsPlugin instance.
     */
    initialize() {
        this.listenTo(this.owner, Converter.EVENT_RESOLVE, this.onResolve, -10);
    }

    /**
     * Mark all members of the given class to be the implementation of the matching interface member.
     *
     * @param context  The context object describing the current state the converter is in.
     * @param classReflection  The reflection of the classReflection class.
     * @param parentClassReflection  The reflection of the interfaceReflection interface.
     */
    private analyzeClass(context: Context, classReflection: DeclarationReflection, parentClassReflection: DeclarationReflection) {
        if (!parentClassReflection.children) {
            return;
        }

        parentClassReflection.children.forEach((interfaceMember: DeclarationReflection) => {
            let classMember: DeclarationReflection|undefined;

            for (let index = 0, count = classReflection.children.length; index < count; index++) {
                const child = classReflection.children[index];
                if (child.name !== interfaceMember.name) {
                    continue;
                }
                if (child.flags.isStatic !== interfaceMember.flags.isStatic) {
                    continue;
                }

                classMember = child;
                break;
            }

            if (!classMember) {
                return;
            }

            const interfaceMemberName = parentClassReflection.name + '.' + interfaceMember.name;
            classMember.implementationOf = new ReferenceType(interfaceMemberName, ReferenceType.SYMBOL_ID_RESOLVED, interfaceMember);

            if (interfaceMember.kindOf(ReflectionKind.FunctionOrMethod) && interfaceMember.signatures && classMember.signatures) {
                interfaceMember.signatures.forEach((interfaceSignature: SignatureReflection) => {
                    const interfaceParameters = interfaceSignature.getParameterTypes();
                    (<DeclarationReflection>classMember).signatures.forEach((classSignature: SignatureReflection) => {
                            classSignature.implementationOf = new ReferenceType(interfaceMemberName, ReferenceType.SYMBOL_ID_RESOLVED, interfaceSignature);
                            this.copyComment(classSignature, interfaceSignature);
                    });
                });
            }
        });
    }

    /**
     * Copy the comment of the source reflection to the target reflection.
     *
     * @param target
     * @param source
     */
    private copyComment(target: Reflection, source: Reflection) {
        if (source.comment && (!target.comment)) {
            target.comment = source.comment;

            if (target instanceof SignatureReflection && target.parameters &&
                source instanceof SignatureReflection && source.parameters) {
                for (let index = 0, count = target.parameters.length; index < count; index++) {
                    if (target.parameters[index].comment) {
                        target.parameters[index].comment.copyFrom(source.parameters[index].comment);
                    }
                }
            }
        }
    }

    /**
     * Triggered when the converter resolves a reflection.
     *
     * @param context  The context object describing the current state the converter is in.
     * @param reflection  The reflection that is currently resolved.
     */
    private onResolve(context: Context, reflection: DeclarationReflection) {
        if (!reflection.kindOf(ReflectionKind.Class)) {
            return;
        }
        const parentClass = (reflection.extendedTypes && reflection.extendedTypes.length) > 0 ? reflection.extendedTypes[0] : undefined;
        if (!parentClass) {
            return;
        }

        const source = <DeclarationReflection> (<ReferenceType> parentClass).reflection;
        if (source && source.kindOf(ReflectionKind.Class)) {
            this.analyzeClass(context, reflection, source);
        }
    }
}
