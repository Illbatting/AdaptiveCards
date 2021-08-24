// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
#pragma once

#include "ChoiceInput.h"
#include "AdaptiveChoiceInput.g.h"

namespace winrt::AdaptiveCards::ObjectModel::WinUI3::implementation
{
    // TODO: This is an interesting pattern; the RT type just wraps the shared type and stores the data into
    // the shared type directly instead of having its own values. Is it possible to make a generic translator
    // between the two using some property<hstring, &::AdaptiveCards::ChoiceInput::SetTitle,
    // &::AdaptiveCards::ChoiceInput::GetTitle>(this) which routes the calls between the two?

    struct DECLSPEC_UUID("7263dbfb-cb43-47f9-9022-b43372f529f9") AdaptiveChoiceInput
        : AdaptiveChoiceInputT<AdaptiveChoiceInput, ITypePeek>
    {
        AdaptiveChoiceInput() : AdaptiveChoiceInput(std::make_shared<::AdaptiveCards::ChoiceInput>()) {}
        AdaptiveChoiceInput(const std::shared_ptr<::AdaptiveCards::ChoiceInput>& sharedChoiceInput);

        // IAdaptiveChoiceInput
        hstring Title();
        void Title(hstring const& title);

        hstring Value();
        void Value(hstring const& value);

        auto ElementType() { return WinUI3::ElementType::ChoiceInput; }

        std::shared_ptr<::AdaptiveCards::ChoiceInput> GetSharedModel();

        // ITypePeek method
        void* PeekAt(REFIID riid) override { return PeekHelper(riid, this); }

    private:
        std::shared_ptr<::AdaptiveCards::ChoiceInput> m_sharedChoiceInput;
    };
}

namespace winrt::AdaptiveCards::ObjectModel::WinUI3::factory_implementation
{
    struct AdaptiveChoiceInput : AdaptiveChoiceInputT<AdaptiveChoiceInput, implementation::AdaptiveChoiceInput>
    {
    };
}